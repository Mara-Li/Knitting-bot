import * as Djs from "discord.js";
import { getUl, t } from "../i18n";
import { CommandName, type RoleIn } from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";
import { createPaginatedChannelModal } from "../utils/modalHandler";

/**
 * Follow or ignore roles in specific channels using a modal
 * @param interaction {@link ChatInputCommandInteraction} The interaction that triggered the command.
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
		const existingRoleIn = allRoleIn.find((r) => r.role.id === roleId);
		state = initRoleInState(userId, guildID, on, roleId, existingRoleIn?.channels ?? []);
	}
	state.currentPage = page;

	const selectedIds = {
		categories: state.selectedCategories,
		channels: state.selectedChannels,
		forums: state.selectedForums,
		threads: state.selectedThreads,
	};

	const shortTitle = `${ul("common.role")}: ${ul("common.roleIn")}`;
	const { modal, hasMore } = createPaginatedChannelModal(
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
		time: 60_000,
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

	const availableOnPage = {
		categories: Array.from(
			guild.channels.cache
				.filter((c) => c.type === Djs.ChannelType.GuildCategory)
				.values()
		)
			.slice(page * 25, (page + 1) * 25)
			.map((c) => c.id),
		channels: Array.from(
			guild.channels.cache.filter((c) => c.type === Djs.ChannelType.GuildText).values()
		)
			.slice(page * 25, (page + 1) * 25)
			.map((c) => c.id),
		forums: Array.from(
			guild.channels.cache.filter((c) => c.type === Djs.ChannelType.GuildForum).values()
		)
			.slice(page * 25, (page + 1) * 25)
			.map((c) => c.id),
		threads: Array.from(
			guild.channels.cache
				.filter(
					(c) =>
						c.type === Djs.ChannelType.PublicThread ||
						c.type === Djs.ChannelType.PrivateThread
				)
				.values()
		)
			.slice(page * 25, (page + 1) * 25)
			.map((c) => c.id),
	};

	for (const id of availableOnPage.categories) {
		if (!newSelectedIds.categories.includes(id)) state.selectedCategories.delete(id);
	}
	for (const id of availableOnPage.channels) {
		if (!newSelectedIds.channels.includes(id)) state.selectedChannels.delete(id);
	}
	for (const id of availableOnPage.threads) {
		if (!newSelectedIds.threads.includes(id)) state.selectedThreads.delete(id);
	}
	for (const id of availableOnPage.forums) {
		if (!newSelectedIds.forums.includes(id)) state.selectedForums.delete(id);
	}

	for (const id of newSelectedIds.categories) state.selectedCategories.add(id);
	for (const id of newSelectedIds.channels) state.selectedChannels.add(id);
	for (const id of newSelectedIds.threads) state.selectedThreads.add(id);
	for (const id of newSelectedIds.forums) state.selectedForums.add(id);

	const buttons = buildRoleInButtons(on, page, hasMore, roleId, ul);
	const summary =
		`Page ${page + 1} - ${ul("common.role")}: ${Djs.roleMention(roleId)}\n` +
		`📁 Catégories: ${state.selectedCategories.size}\n` +
		`💬 Salons: ${state.selectedChannels.size}\n` +
		`🧵 Threads: ${state.selectedThreads.size}\n` +
		`📋 Forums: ${state.selectedForums.size}`;

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

	const channels = [
		...Array.from(state.selectedCategories).map((id) => guild.channels.cache.get(id)),
		...Array.from(state.selectedChannels).map((id) => guild.channels.cache.get(id)),
		...Array.from(state.selectedThreads).map((id) => guild.channels.cache.get(id)),
		...Array.from(state.selectedForums).map((id) => guild.channels.cache.get(id)),
	].filter(Boolean) as (
		| Djs.CategoryChannel
		| Djs.ForumChannel
		| Djs.ThreadChannel
		| Djs.TextChannel
	)[];

	const allRoleIn = getRoleIn(on, guildID);
	const existing = allRoleIn.find((r) => r.role.id === roleId);

	if (channels.length === 0) {
		const newRolesIn = allRoleIn.filter((r) => r.role.id !== roleId);
		setRoleIn(on, guildID, newRolesIn);
		await interaction.update({
			components: [],
			content: ul("roleIn.noLonger.any", {
				mention: Djs.roleMention(role.id),
				on: ul(`roleIn.on.${on}`),
			}) as string,
		});
		clearRoleInState(userId, guildID, on, roleId);
		return;
	}

	const newEntry: RoleIn = {
		channels,
		role,
	};

	if (existing) {
		const updated = allRoleIn.map((r) => (r.role.id === roleId ? newEntry : r));
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
	for (const category of channelsByType.categories) {
		channelLines.push(`- [${ul("common.category")}] ${category.name}`);
	}
	for (const channel of channelsByType.textChannels) {
		channelLines.push(`- [${ul("common.channel")}] ${Djs.channelMention(channel.id)}`);
	}
	for (const thread of channelsByType.threads) {
		channelLines.push(`- [${ul("common.thread")}] ${Djs.channelMention(thread.id)}`);
	}
	for (const forum of channelsByType.forums) {
		channelLines.push(`- [${ul("common.forum")}] ${Djs.channelMention(forum.id)}`);
	}

	const finalMessage = `Le rôle ${Djs.roleMention(role.id)} sera maintenant ${ul(`roleIn.on.${on}`)} dans :\n${channelLines.join("\n")}`;

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
			? ul("follow.thread.description", { role: roleMentioned })
			: ul("ignore.thread.description", { role: roleMentioned });
	const startButton = new Djs.ButtonBuilder()
		.setCustomId(`${on}_roleIn_start_${roleId}`)
		.setStyle(Djs.ButtonStyle.Secondary)
		.setLabel(`${ul(`roleIn.button.${on}`)} ▸`);

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
			await i.update({ components: [], content: "❌ Annulé" });
			collector.stop();
		}
	});

	collector.on("end", () => {
		clearRoleInState(userId, guildID, on, roleId);
	});
}
