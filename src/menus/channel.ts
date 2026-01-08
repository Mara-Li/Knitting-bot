import * as Djs from "discord.js";
import type { TChannel } from "src/interface";
import { TIMEOUT, type Translation } from "../interface";
import { getMaps } from "../maps";
import { discordLogs } from "../utils";
import {
	createPaginationButtons,
	createPaginationState,
	deletePaginationState,
	getPaginationState,
	hasMorePages,
	type PaginatedIdsState,
	paginateIds,
	startPaginatedButtonsFlow,
} from "./flow";
import type { CommandMode } from "./items";
import { getTrackedItems } from "./items";
import { createPaginatedChannelModalByType, processChannelTypeChanges } from "./modal";
import { getTrackedIdsByType, resolveIds } from "./utils";

type ChannelSelectorsForTypeOptions = {
	interaction: Djs.ChatInputCommandInteraction;
	ul: Translation;
	channelType: TChannel;
	mode: CommandMode;
};

/**
 * Handle channel selectors with pagination for follow/ignore commands
 */
export async function channelSelectorsForType({
	interaction,
	ul,
	channelType,
	mode,
}: ChannelSelectorsForTypeOptions) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;

	const trackedItems = getTrackedItems(mode, guildID);

	const trackedIds = getTrackedIdsByType(trackedItems, channelType);
	const paginatedItems = paginateIds(trackedIds, 25);

	const stateKey = `${userId}_${guildID}_${mode}_${channelType}`;
	const state = createPaginationState(stateKey, trackedIds, paginatedItems);
	if (trackedIds.length >= 25) {
		const trackedOnFirstPage = paginatedItems[0]?.length ?? 0;
		const hasMore = hasMorePages(paginatedItems, 0);
		const buttons = createPaginationButtons(mode, 0, hasMore, ul);
		const summary = `Page 1 - ${ul(`common.${channelType}`)} : ${trackedOnFirstPage} ${ul("common.elements")}`;
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
					await handleModalModify(
						buttonInteraction,
						guild,
						userId,
						page,
						ul,
						channelType,
						state,
						mode
					);
				},
				onShowPage: async (buttonInteraction, page) => {
					await showPaginatedMessage(
						buttonInteraction,
						page,
						ul,
						channelType,
						state,
						mode
					);
				},
				onValidate: async (buttonInteraction) => {
					await validateAndSave(
						buttonInteraction,
						userId,
						guildID,
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
		0,
		channelType,
		paginatedItems[0] ?? [],
		undefined
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

		await validateAndSave(
			modalSubmit,
			userId,
			guildID,
			channelType,
			state.originalIds,
			ul,
			mode
		);
	} catch (e) {
		deletePaginationState(stateKey);
		await discordLogs(
			guildID,
			interaction.client,
			ul("logs.errors.modalInteractionFailed", { error: String(e) })
		);
		return;
	}
}

/**
 * Handle modal modification for a specific page
 */
async function handleModalModify(
	interaction: Djs.ButtonInteraction,
	guild: Djs.Guild,
	userId: string,
	page: number,
	ul: Translation,
	channelType: TChannel,
	state: PaginatedIdsState,
	mode: CommandMode
) {
	const pageTrackedIds = state.paginatedItems[page] ?? [];
	const { modal } = await createPaginatedChannelModalByType(
		mode,
		ul,
		0,
		channelType,
		pageTrackedIds,
		undefined
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
			if (e instanceof Djs.DiscordAPIError && e.code === 10062) return;
			throw e;
		}

		const { buttons, pageItemsCount } = getPaginationButtons(
			modalSubmit,
			page,
			ul,
			channelType,
			state,
			mode
		);
		const summary = `Page ${page + 1} - ${ul(`common.${channelType}`)} : ${pageItemsCount} ${ul("common.elements")}`;

		await modalSubmit.editReply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.error(e);
		deletePaginationState(`${userId}_${guild.id}_${mode}_${channelType}`);
	}
}

/**
 * Show paginated message for channel selection by type
 */
async function showPaginatedMessage(
	interaction: Djs.ButtonInteraction,
	page: number,
	ul: Translation,
	channelType: TChannel,
	state: PaginatedIdsState,
	mode: CommandMode
) {
	const totalPages = Object.keys(state.paginatedItems).length;
	const safePage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
	state.currentPage = safePage;

	const trackedOnThisPage = state.paginatedItems[safePage]?.length ?? 0;
	const hasMore = hasMorePages(state.paginatedItems, safePage);

	const buttons = createPaginationButtons(mode, safePage, hasMore, ul);
	const summary = `Page ${safePage + 1} - ${ul(`common.${channelType}`)} : ${trackedOnThisPage} ${ul("common.elements")}`;

	await interaction.editReply({
		components: buttons,
		content: summary,
	});
}

/**
 * Validate and save selections by type
 */
async function validateAndSave(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	userId: string,
	guildID: string,
	channelType: TChannel,
	trackedIds: string[],
	ul: Translation,
	mode: CommandMode
) {
	const stateKey = `${userId}_${guildID}_${mode}_${channelType}`;
	const state = getPaginationState(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const finalIds = Array.from(state.selectedIds);
	const messages: string[] = [];

	const { finalChannelsResolved, originalChannelsResolved, typeName } = await resolveIds(
		channelType,
		guild,
		trackedIds,
		finalIds
	);

	const mentionFromId = (id: string) => {
		const channel = finalChannelsResolved.find((ch) => ch.id === id);
		if (!channel) return `<#${id}>`;
		return channel.type === Djs.ChannelType.GuildCategory ? channel.name : `<#${id}>`;
	};

	const oppositeMode: CommandMode = mode === "follow" ? "ignore" : "follow";
	const oppositeTrackedIds = new Set(getMaps(oppositeMode, typeName, guildID));
	const conflictIds = finalIds.filter((id) => oppositeTrackedIds.has(id));
	if (conflictIds.length > 0) {
		const conflictKey =
			mode === "ignore" ? "ignore.error.conflictTracked" : "follow.error.conflictTracked";
		const conflictMessage = ul(conflictKey, {
			item: conflictIds.map((id) => mentionFromId(id)).join(", "),
		});

		if (interaction.isModalSubmit()) {
			await interaction.reply({
				components: [],
				content: conflictMessage,
				flags: Djs.MessageFlags.Ephemeral,
			});
		} else if (interaction.deferred) {
			await interaction.editReply({
				components: [],
				content: conflictMessage,
			});
		} else {
			await interaction.update({
				components: [],
				content: conflictMessage,
			});
		}

		deletePaginationState(stateKey);
		return;
	}

	processChannelTypeChanges(
		originalChannelsResolved,
		finalChannelsResolved,
		typeName,
		guildID,
		mode,
		ul,
		messages
	);

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
	} else {
		if (interaction.deferred) {
			await interaction.editReply({
				components: [],
				content: finalMessage,
			});
		} else {
			await interaction.update({
				components: [],
				content: finalMessage,
			});
		}
	}

	deletePaginationState(stateKey);
}

export function getPaginationButtons(
	modalSubmit: Djs.ModalSubmitInteraction,
	page: number,
	ul: Translation,
	channelType: TChannel,
	state: PaginatedIdsState,
	mode: CommandMode
) {
	const newSelection =
		modalSubmit.fields.getSelectedChannels(`select_${channelType}`, false) ?? new Map();
	state.paginatedItems[page] = Array.from(newSelection.keys());

	state.selectedIds.clear();
	for (const pageItems of Object.values(state.paginatedItems)) {
		for (const id of pageItems) {
			state.selectedIds.add(id);
		}
	}

	const pageItemsCount = state.paginatedItems[page]?.length ?? 0;
	const hasMore = hasMorePages(state.paginatedItems, page);
	const buttons = createPaginationButtons(mode, page, hasMore, ul);
	return { buttons, hasMore, pageItemsCount };
}
