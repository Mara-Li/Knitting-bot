import {
	type ChannelSelectorsForTypeOptions,
	type PaginatedChannelSelectorsOptions,
	TIMEOUT,
} from "../interfaces";
import { discordLogs } from "../utils";
import { createPaginationButtons, hasMorePages, startPaginatedButtonsFlow } from "./flow";
import { validateAndSave } from "./handlers";
import { getTrackedItems } from "./items";
import { createFirstPageChannelModalByType } from "./modal";
import { handleModalModifyGeneric, showPaginatedMessageGeneric } from "./paginated";
import { createPaginationState, deletePaginationState, paginateIds } from "./state";
import { getTrackedIdsByType } from "./utils";
import db from "../database";

/**
 * Generic handler for paginated channel selectors
 */
export async function startPaginatedChannelSelectorsFlow({
	interaction,
	ul,
	channelType,
	mode,
	trackedIds,
	stateKeyPrefix,
	modalLabel,
	summaryPrefix,
	onValidateCallback,
}: PaginatedChannelSelectorsOptions) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const userId = interaction.user.id;

	const paginatedItems = paginateIds(trackedIds, 25);

	const stateKey = `${userId}_${guildID}_${stateKeyPrefix}`;
	const state = createPaginationState(stateKey, trackedIds, paginatedItems);

	if (trackedIds.length >= 25) {
		const trackedOnFirstPage = paginatedItems[0]?.length ?? 0;
		const hasMore = hasMorePages(paginatedItems, 0);
		const buttons = createPaginationButtons(mode, 0, hasMore, ul);
		const summary = `Page 1 - ${summaryPrefix} : ${trackedOnFirstPage} ${ul("common.elements")}`;

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
						await buttonMessage.edit({ components: [] });
					} catch (e) {
						//safe to ignore
					}
				},
				onModify: async (buttonInteraction, page) => {
					await handleModalModifyGeneric({
						channelType,
						interaction: buttonInteraction,
						modalLabel,
						mode,
						page,
						state,
						stateKey,
						summaryBuilder: (p, pageItemsCount) =>
							`Page ${p + 1} - ${summaryPrefix} : ${pageItemsCount} ${ul("common.elements")}`,
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
							`Page ${safePage + 1} - ${summaryPrefix} : ${trackedOnThisPage} ${ul("common.elements")}`,
						ul,
					});
				},
				onValidate: async (buttonInteraction) => {
					await onValidateCallback(
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
		modalLabel
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
		
		// Resauvegarder le state dans la Enmap après modification
		db.globalPaginationStates.set(stateKey, state);

		await onValidateCallback(
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
			true,
			ul("logs.errors.modalInteractionFailed", { error: String(e) })
		);
		return;
	}
}

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

	const trackedItems = getTrackedItems(mode, guildID);
	const trackedIds = getTrackedIdsByType(trackedItems, channelType);

	await startPaginatedChannelSelectorsFlow({
		channelType,
		interaction,
		modalLabel: undefined,
		mode,
		onValidateCallback: validateAndSave,
		stateKeyPrefix: `${mode}_${channelType}`,
		summaryPrefix: ul(`common.${channelType}`),
		trackedIds,
		ul,
	});
}
