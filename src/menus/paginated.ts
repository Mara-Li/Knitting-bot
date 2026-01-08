import * as Djs from "discord.js";
import type { TChannel } from "src/interface";
import { TIMEOUT, type Translation } from "../interface";
import { createPaginationButtons, hasMorePages } from "./flow";
import type { CommandMode, PaginatedIdsState } from "./interfaces";
import { createFirstPageChannelModalByType } from "./modal";
import { deletePaginationState } from "./state";

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

export async function respondInteraction(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	content: string,
	ephemeralForModal: boolean
) {
	if (interaction.isModalSubmit()) {
		await interaction.reply({
			components: [],
			content,
			flags: ephemeralForModal ? Djs.MessageFlags.Ephemeral : undefined,
		});
		return;
	}

	if (interaction.deferred) {
		await interaction.editReply({ components: [], content });
		return;
	}

	await interaction.update({ components: [], content });
}

export async function handleModalModifyGeneric(options: {
	interaction: Djs.ButtonInteraction;
	userId: string;
	page: number;
	ul: Translation;
	channelType: TChannel;
	state: PaginatedIdsState;
	mode: CommandMode;
	modalLabel?: string;
	summaryBuilder: (page: number, pageItemsCount: number) => string;
	stateKey: string;
}) {
	const {
		interaction,
		userId,
		page,
		ul,
		channelType,
		state,
		mode,
		modalLabel,
		summaryBuilder,
		stateKey,
	} = options;

	const pageTrackedIds = state.paginatedItems[page] ?? [];
	const { modal } = createFirstPageChannelModalByType(
		mode,
		ul,
		channelType,
		pageTrackedIds,
		modalLabel
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

		const summary = summaryBuilder(page, pageItemsCount);

		await modalSubmit.editReply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.warn(e);
		deletePaginationState(stateKey);
	}
}

export async function showPaginatedMessageGeneric(options: {
	interaction: Djs.ButtonInteraction;
	page: number;
	ul: Translation;
	channelType: TChannel;
	state: PaginatedIdsState;
	mode: CommandMode;
	summaryBuilder: (safePage: number, trackedOnThisPage: number) => string;
}) {
	const { interaction, page, ul, state, mode, summaryBuilder } = options;

	const totalPages = Object.keys(state.paginatedItems).length;
	const safePage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
	state.currentPage = safePage;

	const trackedOnThisPage = state.paginatedItems[safePage]?.length ?? 0;
	const hasMore = hasMorePages(state.paginatedItems, safePage);

	const buttons = createPaginationButtons(mode, safePage, hasMore, ul);
	const summary = summaryBuilder(safePage, trackedOnThisPage);

	await interaction.editReply({
		components: buttons,
		content: summary,
	});
}
