import * as Djs from "discord.js";
import type { TChannel } from "src/interface";
import { CommandName, type RoleIn, TIMEOUT, type Translation } from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";
import { resolveChannelsByIds } from "../utils";
import { getPaginationButtons } from "./channel";
import {
	createPaginationButtons,
	createPaginationState,
	deletePaginationState,
	getPaginationState,
	hasMorePages,
	type PaginationState,
	paginateIds,
	startPaginatedButtonsFlow,
} from "./flow";
import type { CommandMode } from "./items";
import { createPaginatedChannelModalByType } from "./modal";
import { getChannelType, resolveIds } from "./utils";

/**
 * Handle roleIn channel selectors with pagination for follow/ignore commands
 */
export async function roleInSelectorsForType(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	channelType: TChannel,
	mode: CommandMode,
	roleId: string
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;

	if (
		mode === "follow" &&
		(getConfig(CommandName.followOnlyChannel, guildID) ||
			getConfig(CommandName.followOnlyRole, guildID))
	) {
		await interaction.reply({
			content: ul("roleIn.error.otherMode"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	if (!getConfig(CommandName.followOnlyRoleIn, guildID) && mode === "follow") {
		await interaction.reply({
			content: ul("roleIn.error.need"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return;
	}

	const allRoleIn = getRoleIn(mode, guildID);
	const existingRoleIn = allRoleIn.find((r) => r.roleId === roleId);
	const allChannelIds = existingRoleIn?.channelIds ?? [];

	const { channelTypeFilter } = getChannelType(channelType);

	const allChannels = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>(guild, allChannelIds, channelTypeFilter);

	const trackedIds = allChannels.map((ch) => ch.id);

	const paginatedItems = paginateIds(trackedIds, 25);

	const stateKey = `${userId}_${guildID}_${mode}_roleIn_${roleId}_${channelType}`;
	const state = createPaginationState(stateKey, trackedIds, paginatedItems);

	if (trackedIds.length >= 25) {
		const trackedOnFirstPage = paginatedItems[0]?.length ?? 0;
		const hasMore = hasMorePages(paginatedItems, 0);

		const buttons = createPaginationButtons(mode, 0, hasMore, ul);
		const roleLabel = Djs.roleMention(roleId);
		const summary = `Page 1 - ${ul("common.role")}: ${roleLabel} - ${ul(`common.${channelType}`)} : ${trackedOnFirstPage} ${ul("common.elements")}`;

		await startPaginatedButtonsFlow(
			{
				initialComponents: buttons,
				initialContent: summary,
				interaction,
				stateKey,
				timeout: TIMEOUT,
				ul,
				userId,
			},
			{
				onCancel: async (buttonInteraction) => {
					deletePaginationState(stateKey);
					await buttonInteraction.editReply({
						components: [],
						content: ul("common.cancelled"),
					});
				},
				onEnd: async (buttonMessage) => {
					deletePaginationState(stateKey);
					try {
						await buttonMessage.edit({ components: [] }).catch(() => undefined);
					} catch (e) {
						/* noop */
					}
				},
				onModify: async (buttonInteraction, page) => {
					await handleRoleInModalModify(
						buttonInteraction,
						guild,
						userId,
						roleId,
						page,
						ul,
						channelType,
						state,
						mode
					);
				},
				onShowPage: async (buttonInteraction, page) => {
					await showRoleInPaginatedMessage(
						buttonInteraction,
						guild,
						roleId,
						page,
						ul,
						channelType,
						state,
						mode
					);
				},
				onValidate: async (buttonInteraction) => {
					await validateRoleInAndSave(
						buttonInteraction,
						userId,
						guildID,
						roleId,
						channelType,
						state.originalIds,
						ul,
						mode
					);
				},
			}
		);

		return;
	}

	const { modal } = await createPaginatedChannelModalByType(
		mode,
		ul,
		guild,
		0,
		channelType,
		paginatedItems[0] ?? [],
		`${ul("common.role")}: ${ul("common.roleIn")}`,
		true
	);

	try {
		await interaction.showModal(modal);

		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === userId,
			time: TIMEOUT,
		});

		const newSelection =
			modalSubmit.fields.getSelectedChannels(`select_${channelType}`, false) ?? new Map();
		const newSelectedIds = Array.from(newSelection.keys());

		state.paginatedItems[0] = newSelectedIds;
		state.selectedIds.clear();
		for (const id of newSelectedIds) {
			state.selectedIds.add(id);
		}

		await validateRoleInAndSave(
			modalSubmit,
			userId,
			guildID,
			roleId,
			channelType,
			state.originalIds,
			ul,
			mode
		);
	} catch (e) {
		console.error(`[${mode} roleIn ${channelType}] Error:`, e);
	}
}

/**
 * Handle modal modification for a specific page
 */
async function handleRoleInModalModify(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	userId: string,
	roleId: string,
	page: number,
	ul: Translation,
	channelType: TChannel,
	state: PaginationState,
	mode: CommandMode
) {
	if (!guild) return;

	const pageTrackedIds = state.paginatedItems[page] ?? [];

	const { modal } = await createPaginatedChannelModalByType(
		mode,
		ul,
		guild,
		0,
		channelType,
		pageTrackedIds,
		`${ul("common.role")}: ${ul("common.roleIn")}`,
		true
	);

	try {
		await interaction.showModal(modal);

		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === userId,
			time: TIMEOUT,
		});

		try {
			await modalSubmit.deferUpdate();
		} catch (e) {
			if (e instanceof Djs.DiscordAPIError && e.code === 10062) {
				console.warn(
					`[${mode} roleIn ${channelType}] Token expiré pour ModalSubmit`,
					e.message
				);
				return;
			}
			throw e;
		}

		const { pageItemsCount, buttons } = getPaginationButtons(
			modalSubmit,
			page,
			ul,
			channelType,
			state,
			mode
		);
		const roleLabel = Djs.roleMention(roleId);
		const summary = `Page ${page + 1} - ${ul("common.role")}: ${roleLabel} - ${ul(`common.${channelType}`)} : ${pageItemsCount} ${ul("common.elements")}`;

		await modalSubmit.editReply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Show paginated message for roleIn channel selection by type
 */
async function showRoleInPaginatedMessage(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	roleId: string,
	page: number,
	ul: Translation,
	channelType: TChannel,
	state: PaginationState,
	mode: CommandMode
) {
	if (!guild) return;

	const totalPages = Object.keys(state.paginatedItems).length;
	const safePage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
	state.currentPage = safePage;

	const trackedOnThisPage = state.paginatedItems[safePage]?.length ?? 0;
	const hasMore = hasMorePages(state.paginatedItems, safePage);

	const buttons = createPaginationButtons(mode, safePage, hasMore, ul);
	const roleLabel = Djs.roleMention(roleId);
	const summary = `Page ${safePage + 1} - ${ul("common.role")}: ${roleLabel} - ${ul(`common.${channelType}`)} : ${trackedOnThisPage} ${ul("common.elements")}`;

	await interaction.editReply({
		components: buttons,
		content: summary,
	});
}

/**
 * Validate and save roleIn selections by type
 */
async function validateRoleInAndSave(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	userId: string,
	guildID: string,
	roleId: string,
	channelType: TChannel,
	trackedIds: string[],
	ul: Translation,
	mode: CommandMode
) {
	const stateKey = `${userId}_${guildID}_${mode}_roleIn_${roleId}_${channelType}`;
	const state = getPaginationState(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const role = guild.roles.cache.get(roleId);
	if (!role) {
		const errorMsg = ul("ignore.role.error", { role: roleId });
		if (interaction.isModalSubmit()) {
			await interaction.reply({
				components: [],
				content: errorMsg,
				flags: Djs.MessageFlags.Ephemeral,
			});
		} else if (interaction.deferred) {
			await interaction.editReply({ components: [], content: errorMsg });
		} else {
			await interaction.update({ components: [], content: errorMsg });
		}
		return;
	}

	const finalIds = Array.from(state.selectedIds);
	const messages: string[] = [];

	const { finalChannelsResolved, originalChannelsResolved, channelTypeFilter } =
		await resolveIds(channelType, guild, trackedIds, finalIds);

	const mentionFromChannel = (
		channel:
			| Djs.CategoryChannel
			| Djs.TextChannel
			| Djs.AnyThreadChannel
			| Djs.ForumChannel
	) => {
		return channel.type === Djs.ChannelType.GuildCategory
			? channel.name
			: `<#${channel.id}>`;
	};

	const oppositeMode: CommandMode = mode === "follow" ? "ignore" : "follow";
	const oppositeRoleIn = getRoleIn(oppositeMode, guildID);
	const oppositeForRole = oppositeRoleIn.find((r) => r.roleId === roleId);
	const oppositeChannelIds = new Set(oppositeForRole?.channelIds ?? []);

	const oppositeChannelsByType = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>(guild, Array.from(oppositeChannelIds), channelTypeFilter);
	const oppositeTypeIds = new Set(oppositeChannelsByType.map((ch) => ch.id));

	const conflictIds = finalIds.filter((id) => oppositeTypeIds.has(id));

	if (conflictIds.length > 0) {
		const conflictChannels = finalChannelsResolved.filter((ch) =>
			conflictIds.includes(ch.id)
		);
		const conflictKey =
			mode === "ignore"
				? "common.conflictTracked.ignore"
				: "common.conflictTracked.follow";
		const conflictMessage = ul(conflictKey, {
			item: conflictChannels.map((ch) => mentionFromChannel(ch)).join(", "),
		});

		if (interaction.isModalSubmit()) {
			await interaction.reply({
				components: [],
				content: conflictMessage,
				flags: Djs.MessageFlags.Ephemeral,
			});
		} else if (interaction.deferred) {
			await interaction.editReply({ components: [], content: conflictMessage });
		} else {
			await interaction.update({ components: [], content: conflictMessage });
		}

		deletePaginationState(stateKey);
		return;
	}

	const oldIds = new Set(originalChannelsResolved.map((ch) => ch.id));
	const newIds = new Set(finalChannelsResolved.map((ch) => ch.id));

	const successKey =
		mode === "follow" ? "follow.thread.success" : "ignore.thread.success";
	const removeKey = mode === "follow" ? "follow.thread.remove" : "ignore.thread.remove";

	for (const oldChannel of originalChannelsResolved) {
		if (!newIds.has(oldChannel.id)) {
			messages.push(
				ul(removeKey, {
					thread: mentionFromChannel(oldChannel),
				})
			);
		}
	}

	for (const newChannel of finalChannelsResolved) {
		if (!oldIds.has(newChannel.id)) {
			messages.push(
				ul(successKey, {
					thread: mentionFromChannel(newChannel),
				})
			);
		}
	}

	const allRoleIn = getRoleIn(mode, guildID);
	const existingEntry = allRoleIn.find((r) => r.roleId === roleId);

	const allChannelTypesIds: string[] = [];

	if (existingEntry) {
		const allExistingChannels = await resolveChannelsByIds<
			Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
		>(guild, existingEntry.channelIds, [
			Djs.ChannelType.GuildCategory,
			Djs.ChannelType.GuildText,
			Djs.ChannelType.PublicThread,
			Djs.ChannelType.PrivateThread,
			Djs.ChannelType.GuildForum,
		]);

		const otherTypeChannels = allExistingChannels.filter((ch) => {
			if (channelType === "category") return ch.type !== Djs.ChannelType.GuildCategory;
			if (channelType === "channel") return ch.type !== Djs.ChannelType.GuildText;
			if (channelType === "forum") return ch.type !== Djs.ChannelType.GuildForum;
			if (channelType === "thread")
				return (
					ch.type !== Djs.ChannelType.PublicThread &&
					ch.type !== Djs.ChannelType.PrivateThread
				);
			return true;
		});

		allChannelTypesIds.push(...otherTypeChannels.map((ch) => ch.id));
	}

	allChannelTypesIds.push(...finalIds);

	if (allChannelTypesIds.length === 0) {
		const updatedRoleIn = allRoleIn.filter((r) => r.roleId !== roleId);
		setRoleIn(mode, guildID, updatedRoleIn);

		const finalMessage = ul("roleIn.noLonger.any", {
			mention: Djs.roleMention(roleId),
			on: ul(`roleIn.on.${mode}`),
		});

		if (interaction.isModalSubmit()) {
			await interaction.reply({
				components: [],
				content: finalMessage,
				flags: Djs.MessageFlags.Ephemeral,
			});
		} else if (interaction.deferred)
			await interaction.editReply({ components: [], content: finalMessage });
		else await interaction.update({ components: [], content: finalMessage });

		deletePaginationState(stateKey);
		return;
	}

	const newEntry: RoleIn = {
		channelIds: allChannelTypesIds,
		roleId,
	};

	if (existingEntry) {
		const updated = allRoleIn.map((r) => (r.roleId === roleId ? newEntry : r));
		setRoleIn(mode, guildID, updated);
	} else {
		allRoleIn.push(newEntry);
		setRoleIn(mode, guildID, allRoleIn);
	}

	const finalMessage =
		messages.length > 0
			? ul("common.summary", { changes: `\n- ${messages.join("\n- ")}` })
			: ul("common.noChanges");

	if (interaction.isModalSubmit()) {
		await interaction.reply({
			components: [],
			content: finalMessage,
			flags: Djs.MessageFlags.Ephemeral,
		});
	} else if (interaction.deferred)
		await interaction.editReply({ components: [], content: finalMessage });
	else await interaction.update({ components: [], content: finalMessage });

	deletePaginationState(stateKey);
}
