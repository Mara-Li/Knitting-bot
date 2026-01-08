import { TIMEOUT } from "../interface";
import { discordLogs } from "../utils";
import { createPaginationButtons, hasMorePages, startPaginatedButtonsFlow } from "./flow";
import { validateAndSave } from "./handlers";
import type { ChannelSelectorsForTypeOptions } from "./interfaces";
import { getTrackedItems } from "./items";
import { createFirstPageChannelModalByType } from "./modal";
import { handleModalModifyGeneric, showPaginatedMessageGeneric } from "./paginated";
import { createPaginationState, deletePaginationState, paginateIds } from "./state";
import { getTrackedIdsByType } from "./utils";

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
					await buttonMessage.edit({ components: [] });
				},
				onModify: async (buttonInteraction, page) => {
					await handleModalModifyGeneric({
						channelType,
						interaction: buttonInteraction,
						modalLabel: undefined,
						mode,
						page,
						state,
						stateKey,
						summaryBuilder: (p, pageItemsCount) =>
							`Page ${p + 1} - ${ul(`common.${channelType}`)} : ${pageItemsCount} ${ul("common.elements")}`,
						ul,
						userId,
					});
				},
				onShowPage: async (buttonInteraction, page) => {
					await showPaginatedMessageGeneric({
						channelType,
						interaction: buttonInteraction,
						mode,
						page,
						state,
						summaryBuilder: (safePage, trackedOnThisPage) =>
							`Page ${safePage + 1} - ${ul(`common.${channelType}`)} : ${trackedOnThisPage} ${ul("common.elements")}`,
						ul,
					});
				},
				onValidate: async (buttonInteraction) => {
					await validateAndSave(
						buttonInteraction,
						userId,
						guildID,
						channelType,
						trackedIds,
						ul,
						mode
					);
				},
			}
		);

		return;
	}
	const { modal } = createFirstPageChannelModalByType(
		mode,
		ul,
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
			trackedIds,
			ul,
			mode
		);
		deletePaginationState(stateKey);
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
