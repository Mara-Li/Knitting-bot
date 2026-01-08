import * as Djs from "discord.js";
import type { TChannel } from "src/interface";
import { TIMEOUT, type Translation } from "../interface";
import { getRoleIn } from "../maps";
import { discordLogs } from "../utils";
import {
	createPaginationButtons,
	createPaginationState,
	deletePaginationState,
	hasMorePages,
	paginateIds,
	startPaginatedButtonsFlow,
} from "./flow";
import { checkRoleInConstraints, validateRoleInAndSave } from "./handlers";
import type { CommandMode } from "./interfaces";
import { createFirstPageChannelModalByType } from "./modal";
import { handleModalModifyGeneric, showPaginatedMessageGeneric } from "./paginated";

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

	// Check roleIn constraints
	const isAllowed = await checkRoleInConstraints(interaction, guildID, mode, ul);
	if (!isAllowed) return;

	const allRoleIn = getRoleIn(mode, guildID);
	const existingRoleIn = allRoleIn.find((r) => r.roleId === roleId);

	const trackedIds = existingRoleIn?.channelIds ?? [];

	const paginatedItems = paginateIds(trackedIds, 25);

	const stateKey = `${userId}_${guildID}_${mode}_roleIn_${roleId}_${channelType}`;
	const state = createPaginationState(stateKey, trackedIds, paginatedItems);

	if (trackedIds.length >= 25) {
		const trackedOnFirstPage = paginatedItems[0]?.length ?? 0;
		const hasMore = hasMorePages(paginatedItems, 0);

		const buttons = createPaginationButtons(mode, 0, hasMore, ul);
		const roleLabel = Djs.roleMention(roleId);
		const summary = `Page 1 - ${ul("common.role")}: ${roleLabel} - ${ul(
			`common.${channelType}`
		)} : ${trackedOnFirstPage} ${ul("common.elements")}`;

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
						modalLabel: `${ul("common.role")}: ${ul("common.roleIn")}`,
						mode,
						page,
						state,
						stateKey,
						summaryBuilder: (p, pageItemsCount) => {
							const roleLabel2 = Djs.roleMention(roleId);
							return `Page ${p + 1} - ${ul("common.role")}: ${roleLabel2} - ${ul(
								`common.${channelType}`
							)} : ${pageItemsCount} ${ul("common.elements")}`;
						},
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
						summaryBuilder: (safePage, trackedOnThisPage) => {
							const roleLabel2 = Djs.roleMention(roleId);
							return `Page ${safePage + 1} - ${ul("common.role")}: ${roleLabel2} - ${ul(
								`common.${channelType}`
							)} : ${trackedOnThisPage} ${ul("common.elements")}`;
						},
						ul,
					});
				},
				onValidate: async (buttonInteraction) => {
					await validateRoleInAndSave(
						buttonInteraction,
						userId,
						guildID,
						roleId,
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
		`${ul("common.role")}: ${ul("common.roleIn")}`
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
			trackedIds,
			ul,
			mode
		);
		deletePaginationState(stateKey);
	} catch (e) {
		console.warn(`[${mode} roleIn ${channelType}] Error:`, e);
		await discordLogs(
			guildID,
			interaction.client,
			`${ul("common.error", { error: String(e) })}`
		);
		deletePaginationState(stateKey);
		return;
	}
}
