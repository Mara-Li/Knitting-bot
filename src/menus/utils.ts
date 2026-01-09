import type { CommandInteractionOptionResolver } from "discord.js";
import * as Djs from "discord.js";
import db from "../database";
import { getUl, t } from "../i18n";
import {
	type CommandMode,
	type RoleIn,
	type RoleInPaginationState,
	type TChannel,
	TIMEOUT,
	type TrackedItems,
	type Translation,
} from "../interfaces";
import { resolveChannelsByIds } from "../utils";
import { checkRoleInConstraints } from "./handlers";
import { createPaginatedChannelModal } from "./modal";

/**
 * Extract and validate role option from interaction
 * @param options The command options
 * @returns The role ID or null if invalid
 */
export function extractAndValidateRoleOption(options: CommandInteractionOptionResolver) {
	const roleOpt = options.get(t("common.role").toLowerCase());
	if (!roleOpt || !roleOpt.role) return null;

	return roleOpt.role.id;
}

function roleInKey(userId: string, guildId: string, mode: CommandMode, roleId: string) {
	return `${userId}_${guildId}_${mode}_${roleId}`;
}

function initRoleInState(
	userId: string,
	guildId: string,
	mode: CommandMode,
	roleId: string,
	initialChannels: (
		| Djs.CategoryChannel
		| Djs.ForumChannel
		| Djs.ThreadChannel
		| Djs.TextChannel
	)[]
): RoleInPaginationState {
	const key = roleInKey(userId, guildId, mode, roleId);
	const state: RoleInPaginationState = {
		currentPage: 0,
		guildId,
		mode,
		roleId,
		selectedCategories: new Set(
			initialChannels
				.filter((c) => c.type === Djs.ChannelType.GuildCategory)
				.map((c) => c.id)
		),
		selectedChannels: new Set(
			initialChannels.filter((c) => c.type === Djs.ChannelType.GuildText).map((c) => c.id)
		),
		selectedForums: new Set(
			initialChannels
				.filter((c) => c.type === Djs.ChannelType.GuildForum)
				.map((c) => c.id)
		),
		selectedThreads: new Set(
			initialChannels
				.filter(
					(c) =>
						c.type === Djs.ChannelType.PublicThread ||
						c.type === Djs.ChannelType.PrivateThread
				)
				.map((c) => c.id)
		),
		userId,
	};
	db.roleInStates.set(key, state);
	return state;
}

function getRoleInState(
	userId: string,
	guildId: string,
	mode: CommandMode,
	roleId: string
): RoleInPaginationState | undefined {
	const key = roleInKey(userId, guildId, mode, roleId);
	return db.roleInStates.get(key);
}

function clearRoleInState(
	userId: string,
	guildId: string,
	mode: CommandMode,
	roleId: string
) {
	db.roleInStates.delete(roleInKey(userId, guildId, mode, roleId));
}

function buildRoleInButtons(
	on: CommandMode,
	page: number,
	hasMore: boolean,
	roleId: string,
	ul: ReturnType<typeof getUl>
) {
	const buttons: Djs.ButtonBuilder[] = [];
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${on}_roleIn_prev_${roleId}_${page}`)
			.setEmoji("◀️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setLabel(ul("common.previous"))
			.setDisabled(page === 0)
	);
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${on}_roleIn_next_${roleId}_${page}`)
			.setEmoji("➡️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setLabel(ul("common.next"))
			.setDisabled(!hasMore)
	);
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${on}_roleIn_validate_${roleId}`)
			.setEmoji("✅")
			.setStyle(Djs.ButtonStyle.Success)
			.setLabel(ul("common.validate"))
	);
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${on}_roleIn_cancel_${roleId}`)
			.setEmoji("❌")
			.setStyle(Djs.ButtonStyle.Danger)
			.setLabel(ul("common.cancel"))
	);
	return [new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(buttons)];
}

function resolveInitialChannels(
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	channelIds: string[]
): (Djs.CategoryChannel | Djs.ForumChannel | Djs.ThreadChannel | Djs.TextChannel)[] {
	const initialChannels: (
		| Djs.CategoryChannel
		| Djs.ForumChannel
		| Djs.ThreadChannel
		| Djs.TextChannel
	)[] = [];

	for (const id of channelIds) {
		const channel = guild.channels.cache.get(id);
		if (channel) {
			if (
				channel.type === Djs.ChannelType.GuildCategory ||
				channel.type === Djs.ChannelType.GuildText ||
				channel.type === Djs.ChannelType.GuildForum ||
				channel.type === Djs.ChannelType.PublicThread ||
				channel.type === Djs.ChannelType.PrivateThread
			) {
				initialChannels.push(
					channel as
						| Djs.CategoryChannel
						| Djs.ForumChannel
						| Djs.ThreadChannel
						| Djs.TextChannel
				);
			}
		}
	}

	return initialChannels;
}

/**
 * Charge ou crée l'état RoleIn pour la pagination
 */
function loadOrCreateRoleInState(
	userId: string,
	guildID: string,
	on: CommandMode,
	roleId: string,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	page: number
): RoleInPaginationState {
	let state = getRoleInState(userId, guildID, on, roleId);

	if (!state) {
		const allRoleIn = db.settings.get(guildID, `${on}.onlyRoleIn`) ?? [];
		const existingRoleIn = allRoleIn.find((r) => r.roleId === roleId);
		const initialChannels = resolveInitialChannels(
			guild,
			existingRoleIn?.channelIds ?? []
		);
		state = initRoleInState(userId, guildID, on, roleId, initialChannels);
	}

	state.currentPage = page;
	db.roleInStates.set(roleInKey(userId, guildID, on, roleId), state);
	return state;
}

/**
 * Collecte les sélections actuelles depuis l'état
 */
function collectCurrentSelections(state: RoleInPaginationState) {
	return {
		categories: Array.from(state.selectedCategories),
		channels: Array.from(state.selectedChannels),
		forums: Array.from(state.selectedForums),
		threads: Array.from(state.selectedThreads),
	};
}

/**
 * Vérifie si des sélections ont été effectuées
 */
function hasAnySelections(selectedIds: {
	categories: string[];
	channels: string[];
	forums: string[];
	threads: string[];
}): boolean {
	return (
		selectedIds.channels.length > 0 ||
		selectedIds.forums.length > 0 ||
		selectedIds.threads.length > 0 ||
		selectedIds.categories.length > 0
	);
}

/**
 * Attend la soumission du modal par l'utilisateur
 */
async function waitForModalSubmit(
	interaction: Djs.ButtonInteraction,
	userId: string
): Promise<Djs.ModalSubmitInteraction | null> {
	try {
		return await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === userId,
			time: TIMEOUT,
		});
	} catch {
		// Timeout
		return null;
	}
}

/**
 * Extrait les nouvelles sélections depuis la soumission du modal
 */
function extractModalSelections(modalSubmit: Djs.ModalSubmitInteraction) {
	const newCategories =
		modalSubmit.fields.getSelectedChannels("select_categories", false, [
			Djs.ChannelType.GuildCategory,
		]) ?? new Map();
	const newChannels =
		modalSubmit.fields.getSelectedChannels("select_channels", false, [
			Djs.ChannelType.GuildText,
		]) ?? new Map();
	const newThreads =
		modalSubmit.fields.getSelectedChannels("select_threads", false, [
			Djs.ChannelType.PublicThread,
			Djs.ChannelType.PrivateThread,
		]) ?? new Map();
	const newForums =
		modalSubmit.fields.getSelectedChannels("select_forums", false, [
			Djs.ChannelType.GuildForum,
		]) ?? new Map();

	return {
		categories: Array.from(newCategories.keys()),
		channels: Array.from(newChannels.keys()),
		forums: Array.from(newForums.keys()),
		threads: Array.from(newThreads.keys()),
	};
}

/**
 * Met à jour l'état en retirant les éléments désélectionnés de la page actuelle
 */
function removeDeselectedItems(
	state: RoleInPaginationState,
	pageItemIds: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	},
	newSelectedIds: {
		categories: string[];
		channels: string[];
		forums: string[];
		threads: string[];
	}
) {
	for (const id of pageItemIds.categories) {
		if (!newSelectedIds.categories.includes(id)) {
			state.selectedCategories.delete(id);
		}
	}

	for (const id of pageItemIds.channels) {
		if (!newSelectedIds.channels.includes(id)) {
			state.selectedChannels.delete(id);
		}
	}

	for (const id of pageItemIds.threads) {
		if (!newSelectedIds.threads.includes(id)) {
			state.selectedThreads.delete(id);
		}
	}

	for (const id of pageItemIds.forums) {
		if (!newSelectedIds.forums.includes(id)) {
			state.selectedForums.delete(id);
		}
	}
}

/**
 * Ajoute les nouvelles sélections à l'état
 */
function addNewSelections(
	state: RoleInPaginationState,
	newSelectedIds: {
		categories: string[];
		channels: string[];
		forums: string[];
		threads: string[];
	}
) {
	for (const id of newSelectedIds.categories) state.selectedCategories.add(id);
	for (const id of newSelectedIds.channels) state.selectedChannels.add(id);
	for (const id of newSelectedIds.threads) state.selectedThreads.add(id);
	for (const id of newSelectedIds.forums) state.selectedForums.add(id);
}

/**
 * Construit le message de résumé des sélections
 */
function buildSummaryMessage(
	state: RoleInPaginationState,
	page: number,
	roleId: string,
	ul: ReturnType<typeof getUl>
): string {
	const s = ul("common.space");
	return (
		`Page ${page + 1} - ${ul("common.role")}: ${Djs.roleMention(roleId)}\n` +
		`📁 ${ul("common.category")}${s}: ${state.selectedCategories.size}\n` +
		`💬 ${ul("common.channel")}${s}: ${state.selectedChannels.size}\n` +
		`🧵 ${ul("common.thread")}${s}: ${state.selectedThreads.size}\n` +
		`📋 ${ul("common.forum")}${s}: ${state.selectedForums.size}`
	);
}

async function showRoleInPaginatedModal(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	userId: string,
	guildID: string,
	roleId: string,
	page: number,
	ul: ReturnType<typeof getUl>,
	on: CommandMode
) {
	const state = loadOrCreateRoleInState(userId, guildID, on, roleId, guild, page);
	const selectedIds = collectCurrentSelections(state);

	if (!hasAnySelections(selectedIds)) {
		await interaction.reply({
			content: ul("follow.thread.noSelection"),
			ephemeral: true,
		});
		return;
	}

	const shortTitle = `${ul("common.role")}: ${ul("common.roleIn")}`;
	const { modal, hasMore, pageItemIds } = createPaginatedChannelModal(
		on,
		ul,
		page,
		selectedIds,
		shortTitle
	);

	await interaction.showModal(modal);

	const modalSubmit = await waitForModalSubmit(interaction, userId);
	if (!modalSubmit) return;

	const newSelectedIds = extractModalSelections(modalSubmit);

	removeDeselectedItems(state, pageItemIds, newSelectedIds);
	addNewSelections(state, newSelectedIds);

	const buttons = buildRoleInButtons(on, page, hasMore, roleId, ul);
	const summary = buildSummaryMessage(state, page, roleId, ul);

	await modalSubmit.reply({
		components: buttons,
		content: summary,
		flags: Djs.MessageFlags.Ephemeral,
	});
}

async function validateRoleInSelection(
	interaction: Djs.ButtonInteraction,
	on: CommandMode,
	roleId: string,
	ul: ReturnType<typeof getUl>
) {
	const userId = interaction.user.id;
	const guild = interaction.guild;
	if (!guild) return;
	const guildID = guild.id;

	const state = getRoleInState(userId, guildID, on, roleId);
	if (!state) {
		await interaction.update({ components: [], content: ul("error.failedReply") });
		return;
	}

	const role = guild.roles.cache.get(roleId);
	if (!role) {
		await interaction.update({ components: [], content: ul("ignore.role.error") });
		return;
	}

	const allIds = [
		...Array.from(state.selectedCategories),
		...Array.from(state.selectedChannels),
		...Array.from(state.selectedThreads),
		...Array.from(state.selectedForums),
	];
	const channels = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.ForumChannel | Djs.ThreadChannel | Djs.TextChannel
	>(guild, allIds, [
		Djs.ChannelType.GuildCategory,
		Djs.ChannelType.GuildText,
		Djs.ChannelType.GuildForum,
		Djs.ChannelType.PublicThread,
		Djs.ChannelType.PrivateThread,
	]);

	const allRoleIn = db.settings.get(guildID, `${on}.onlyRoleIn`) ?? [];
	const existing = allRoleIn.find((r) => r.roleId === roleId);

	if (channels.length === 0) {
		const newRolesIn = allRoleIn.filter((r) => r.roleId !== roleId);
		db.settings.set(guildID, newRolesIn, `${on}.onlyRoleIn`);
		await interaction.update({
			components: [],
			content: ul("roleIn.noLonger.any", {
				mention: Djs.roleMention(role.id),
				on: ul(`roleIn.on.${on}`),
			}),
		});
		clearRoleInState(userId, guildID, on, roleId);
		return;
	}

	const newEntry: RoleIn = {
		channelIds: channels.map((ch) => ch.id),
		roleId,
	};

	if (existing) {
		const updated = allRoleIn.map((r) => (r.roleId === roleId ? newEntry : r));
		db.settings.set(guildID, updated, `${on}.onlyRoleIn`);
	} else db.settings.set(guildID, [...allRoleIn, newEntry], `${on}.onlyRoleIn`);

	const channelsByType = {
		categories: channels.filter((c) => c.type === Djs.ChannelType.GuildCategory),
		forums: channels.filter((c) => c.type === Djs.ChannelType.GuildForum),
		textChannels: channels.filter((c) => c.type === Djs.ChannelType.GuildText),
		threads: channels.filter(
			(c) =>
				c.type === Djs.ChannelType.PublicThread ||
				c.type === Djs.ChannelType.PrivateThread
		),
	};

	const channelLines: string[] = [];
	for (const category of channelsByType.categories)
		channelLines.push(`- [${ul("common.category")}] ${category.name}`);

	for (const channel of channelsByType.textChannels)
		channelLines.push(`- [${ul("common.channel")}] ${Djs.channelMention(channel.id)}`);

	for (const thread of channelsByType.threads)
		channelLines.push(`- [${ul("common.thread")}] ${Djs.channelMention(thread.id)}`);

	for (const forum of channelsByType.forums)
		channelLines.push(`- [${ul("common.forum")}] ${Djs.channelMention(forum.id)}`);

	const finalMessage = ul("roleIn.updated", {
		channels: `\n${channelLines.join("\n")}`,
		mention: Djs.roleMention(role.id),
		on: ul(`roleIn.on.${on}`).toLowerCase(),
	});

	await interaction.update({ components: [], content: finalMessage });
	clearRoleInState(userId, guildID, on, roleId);
}

export async function interactionRoleInChannel(
	interaction: Djs.ChatInputCommandInteraction,
	on: CommandMode
) {
	if (!interaction.guild) return;
	const guildID = interaction.guild.id;
	const ul = getUl(interaction);

	const isAllowed = await checkRoleInConstraints(interaction, guildID, on, ul);
	if (!isAllowed) return;

	const roleOpt = interaction.options.get(t("common.role").toLowerCase());
	if (!roleOpt || !roleOpt.role) {
		await interaction.reply({
			content: ul("ignore.role.error", { role: roleOpt?.name }) as string,
		});
		return;
	}

	const roleId = roleOpt.role.id;
	const userId = interaction.user.id;
	const roleMentioned = Djs.roleMention(roleId);

	const prompt =
		on === "follow"
			? ul("follow.thread.descriptionWithRole", { role: roleMentioned })
			: ul("ignore.thread.descriptionWithRole", { role: roleMentioned });
	const startButton = new Djs.ButtonBuilder()
		.setCustomId(`${on}_roleIn_start_${roleId}`)
		.setStyle(Djs.ButtonStyle.Secondary)
		.setLabel(`${ul("roleIn.button")} ▸`);

	const row = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(startButton);

	const embed = new Djs.EmbedBuilder()
		.setColor(on === "follow" ? 0x2f8e7d : 0x8e2f3a)
		.setTitle(`${ul(`roleIn.on.${on}`)}`)
		.setDescription(prompt);

	await interaction.reply({
		components: [row],
		embeds: [embed],
		flags: Djs.MessageFlags.Ephemeral,
	});
	const reply = await interaction.fetchReply();
	const collector = interaction.channel?.createMessageComponentCollector({
		componentType: Djs.ComponentType.Button,
		filter: (i: Djs.ButtonInteraction) =>
			i.user.id === userId && i.message.id === reply.id,
		time: TIMEOUT,
	});

	if (!collector) return;

	collector.on("collect", async (i: Djs.ButtonInteraction) => {
		if (i.customId === `${on}_roleIn_start_${roleId}`) {
			await showRoleInPaginatedModal(
				i,
				interaction.guild!,
				userId,
				guildID,
				roleId,
				0,
				ul,
				on
			);
			return;
		}
		if (i.customId.startsWith(`${on}_roleIn_prev_${roleId}_`)) {
			const page = Number.parseInt(i.customId.split("_").pop() || "0", 10);
			const prev = Math.max(0, page - 1);
			await showRoleInPaginatedModal(
				i,
				interaction.guild!,
				userId,
				guildID,
				roleId,
				prev,
				ul,
				on
			);
			return;
		}
		if (i.customId.startsWith(`${on}_roleIn_next_${roleId}_`)) {
			const page = Number.parseInt(i.customId.split("_").pop() || "0", 10);
			const next = page + 1;
			await showRoleInPaginatedModal(
				i,
				interaction.guild!,
				userId,
				guildID,
				roleId,
				next,
				ul,
				on
			);
			return;
		}
		if (i.customId === `${on}_roleIn_validate_${roleId}`) {
			await validateRoleInSelection(i as Djs.ButtonInteraction, on, roleId, ul);
			collector.stop();
			return;
		}
		if (i.customId === `${on}_roleIn_cancel_${roleId}`) {
			clearRoleInState(userId, guildID, on, roleId);
			await i.update({ components: [], content: ul("common.cancelled") });
			collector.stop();
		}
	});

	collector.on("end", (_collected, reason) => {
		clearRoleInState(userId, guildID, on, roleId);
		if (reason === "user") return;
		void interaction
			.editReply({ components: [], content: ul("common.timeOut") })
			.catch(() => undefined);
	});
}

export async function resolveIds(
	channelType: TChannel,
	guild: Djs.Guild,
	trackedIds: string[],
	finalIds: string[]
) {
	const { channelTypeFilter, typeName } = getChannelType(channelType);

	// Résoudre les IDs en objets Channel
	const finalChannelsResolved = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>(guild, finalIds, channelTypeFilter);

	const originalChannelsResolved = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>(guild, trackedIds, channelTypeFilter);

	return { channelTypeFilter, finalChannelsResolved, originalChannelsResolved, typeName };
}

export function getChannelType(channelType: TChannel) {
	const typeName = channelType;
	let channelTypeFilter: Djs.ChannelType[];

	switch (channelType) {
		case "channel":
			channelTypeFilter = [Djs.ChannelType.GuildText];
			break;
		case "thread":
			channelTypeFilter = [Djs.ChannelType.PublicThread, Djs.ChannelType.PrivateThread];
			break;
		case "category":
			channelTypeFilter = [Djs.ChannelType.GuildCategory];
			break;
		case "forum":
			channelTypeFilter = [Djs.ChannelType.GuildForum];
			break;
	}
	return { channelTypeFilter, typeName };
}

export async function removeRoleIn(
	options: Djs.CommandInteractionOptionResolver,
	guild: string,
	mode: "follow" | "ignore",
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	const roleId = options.getRole(t("common.role"), true).id;
	const allRoleIn = db.settings.get(guild, `${mode}.onlyRoleIn`) ?? [];
	const filtered = allRoleIn.filter((ri) => ri.roleId !== roleId);
	db.settings.set(guild, filtered, `${mode}.onlyRoleIn`);
	await interaction.reply({
		content: ul("roleIn.noLonger.any", {
			mention: Djs.roleMention(roleId),
			on: ul(`roleIn.on.${mode}`),
		}),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}

export function getTrackedIdsByType(
	trackedItems: TrackedItems,
	channelType: TChannel
): string[] {
	switch (channelType) {
		case "channel":
			return trackedItems.channels;
		case "thread":
			return trackedItems.threads;
		case "category":
			return trackedItems.categories;
		case "forum":
			return trackedItems.forums;
		default:
			return [];
	}
}
