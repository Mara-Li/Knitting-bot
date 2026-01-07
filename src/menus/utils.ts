import type { CommandInteractionOptionResolver } from "discord.js";
import * as Djs from "discord.js";
import { getUl, t } from "../i18n";
import {
	CommandName,
	type RoleIn,
	type TChannel,
	TIMEOUT,
	type Translation,
	TypeName,
} from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";
import { resolveChannelsByIds } from "../utils";
import { createPaginatedChannelModal } from "./modalHandler";

/**
 * Extract and validate role option from interaction
 * @param options The command options
 * @returns The role ID or null if invalid
 */
export async function extractAndValidateRoleOption(
	options: CommandInteractionOptionResolver
): Promise<string | null> {
	const roleOpt = options.get(t("common.role").toLowerCase());
	if (!roleOpt || !roleOpt.role) {
		return null;
	}
	return roleOpt.role.id;
}

/**
 * Follow or ignore roles in specific channels using a modal
 * @param on {"follow" | "ignore"} The mode to use
 */
type RoleInMode = "follow" | "ignore";

type RoleInPaginationState = {
	userId: string;
	guildId: string;
	mode: RoleInMode;
	roleId: string;
	currentPage: number;
	selectedCategories: Set<string>;
	selectedChannels: Set<string>;
	selectedThreads: Set<string>;
	selectedForums: Set<string>;
};

const roleInStates = new Map<string, RoleInPaginationState>();

function roleInKey(userId: string, guildId: string, mode: RoleInMode, roleId: string) {
	return `${userId}_${guildId}_${mode}_${roleId}`;
}

function initRoleInState(
	userId: string,
	guildId: string,
	mode: RoleInMode,
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
	roleInStates.set(key, state);
	return state;
}

function getRoleInState(
	userId: string,
	guildId: string,
	mode: RoleInMode,
	roleId: string
): RoleInPaginationState | undefined {
	return roleInStates.get(roleInKey(userId, guildId, mode, roleId));
}

function clearRoleInState(
	userId: string,
	guildId: string,
	mode: RoleInMode,
	roleId: string
) {
	roleInStates.delete(roleInKey(userId, guildId, mode, roleId));
}

function buildRoleInButtons(
	on: RoleInMode,
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

async function showRoleInPaginatedModal(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	userId: string,
	guildID: string,
	roleId: string,
	page: number,
	ul: ReturnType<typeof getUl>,
	on: RoleInMode
) {
	let state = getRoleInState(userId, guildID, on, roleId);
	if (!state) {
		const allRoleIn = getRoleIn(on, guildID);
		const existingRoleIn = allRoleIn.find((r) => r.roleId === roleId);
		// Résoudre les IDs en objets Discord depuis le cache de la guilde
		const initialChannels: (
			| Djs.CategoryChannel
			| Djs.ForumChannel
			| Djs.ThreadChannel
			| Djs.TextChannel
		)[] = [];
		for (const id of existingRoleIn?.channelIds ?? []) {
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
		state = initRoleInState(userId, guildID, on, roleId, initialChannels);
	}
	state.currentPage = page;

	const selectedIds = {
		categories: Array.from(state.selectedCategories),
		channels: Array.from(state.selectedChannels),
		forums: Array.from(state.selectedForums),
		threads: Array.from(state.selectedThreads),
	};

	const shortTitle = `${ul("common.role")}: ${ul("common.roleIn")}`;
	const { modal, hasMore, pageItemIds } = await createPaginatedChannelModal(
		on,
		ul,
		guild,
		page,
		selectedIds,
		shortTitle
	);

	await interaction.showModal(modal);
	const modalSubmit = await interaction.awaitModalSubmit({
		filter: (i) => i.user.id === userId,
		time: TIMEOUT,
	});

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

	const newSelectedIds = {
		categories: Array.from(newCategories.keys()),
		channels: Array.from(newChannels.keys()),
		forums: Array.from(newForums.keys()),
		threads: Array.from(newThreads.keys()),
	};

	const availableOnPage = pageItemIds;

	for (const id of availableOnPage.categories)
		if (!newSelectedIds.categories.includes(id)) state.selectedCategories.delete(id);

	for (const id of availableOnPage.channels)
		if (!newSelectedIds.channels.includes(id)) state.selectedChannels.delete(id);

	for (const id of availableOnPage.threads)
		if (!newSelectedIds.threads.includes(id)) state.selectedThreads.delete(id);

	for (const id of availableOnPage.forums)
		if (!newSelectedIds.forums.includes(id)) state.selectedForums.delete(id);

	for (const id of newSelectedIds.categories) state.selectedCategories.add(id);
	for (const id of newSelectedIds.channels) state.selectedChannels.add(id);
	for (const id of newSelectedIds.threads) state.selectedThreads.add(id);
	for (const id of newSelectedIds.forums) state.selectedForums.add(id);
	const s = ul("common.space");
	const buttons = buildRoleInButtons(on, page, hasMore, roleId, ul);
	const summary =
		`Page ${page + 1} - ${ul("common.role")}: ${Djs.roleMention(roleId)}\n` +
		`📁 ${ul("common.category")}${s}: ${state.selectedCategories.size}\n` +
		`💬 ${ul("common.channel")}${s}: ${state.selectedChannels.size}\n` +
		`🧵 ${ul("common.thread")}${s}: ${state.selectedThreads.size}\n` +
		`📋 ${ul("common.forum")}${s}: ${state.selectedForums.size}`;

	await modalSubmit.reply({
		components: buttons,
		content: summary,
		flags: Djs.MessageFlags.Ephemeral,
	});
}

async function validateRoleInSelection(
	interaction: Djs.ButtonInteraction,
	on: RoleInMode,
	roleId: string,
	ul: ReturnType<typeof getUl>
) {
	const userId = interaction.user.id;
	const guildID = interaction.guild?.id;
	if (!guildID) return;
	const guild = interaction.guild;
	if (!guild) return;

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

	const allRoleIn = getRoleIn(on, guildID);
	const existing = allRoleIn.find((r) => r.roleId === roleId);

	if (channels.length === 0) {
		const newRolesIn = allRoleIn.filter((r) => r.roleId !== roleId);
		setRoleIn(on, guildID, newRolesIn);
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
		setRoleIn(on, guildID, updated);
	} else {
		allRoleIn.push(newEntry);
		setRoleIn(on, guildID, allRoleIn);
	}

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
	on: RoleInMode
) {
	if (!interaction.guild) return;
	const guildID = interaction.guild.id;
	const ul = getUl(interaction);

	if (
		on === "follow" &&
		(getConfig(CommandName.followOnlyChannel, guildID) ||
			getConfig(CommandName.followOnlyRole, guildID))
	) {
		await interaction.reply({ content: ul("roleIn.error.otherMode") as string });
		return;
	}

	if (!getConfig(CommandName.followOnlyRoleIn, guildID) && on === "follow") {
		await interaction.reply({ content: ul("roleIn.error.need") as string });
		return;
	}

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

	const collector = interaction.channel?.createMessageComponentCollector({
		componentType: Djs.ComponentType.Button,
		filter: (i: Djs.ButtonInteraction) => i.user.id === userId,
		time: 600_000,
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
			await i.update({ components: [], content: ul("common.cancel") });
			collector.stop();
		}
	});

	collector.on("end", () => {
		clearRoleInState(userId, guildID, on, roleId);
		// Remove buttons when the collector times out and update content
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
	let typeName: TypeName;
	let channelTypeFilter: Djs.ChannelType[];

	switch (channelType) {
		case "channel":
			typeName = TypeName.channel;
			channelTypeFilter = [Djs.ChannelType.GuildText];
			break;
		case "thread":
			typeName = TypeName.thread;
			channelTypeFilter = [Djs.ChannelType.PublicThread, Djs.ChannelType.PrivateThread];
			break;
		case "category":
			typeName = TypeName.category;
			channelTypeFilter = [Djs.ChannelType.GuildCategory];
			break;
		case "forum":
			typeName = TypeName.forum;
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
	const allRoleIn = getRoleIn(mode, guild);
	const filtered = allRoleIn.filter((ri) => ri.roleId !== roleId);
	setRoleIn(mode, guild, filtered);
	await interaction.reply({
		content: ul("roleIn.noLonger.any", {
			on: ul(`roleIn.on.${mode}`),
			role: Djs.roleMention(roleId),
		}),
		flags: Djs.MessageFlags.Ephemeral,
	});
	return;
}
