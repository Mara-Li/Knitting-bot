import * as Djs from "discord.js";
import { TIMEOUT, type Translation } from "../interface";

export type PaginationState = {
	currentPage: number;
	originalIds: string[];
	paginatedItems: Record<number, string[]>;
	selectedIds: Set<string>;
};

export type PaginatedHandlers = {
	onModify: (buttonInteraction: Djs.ButtonInteraction, page: number) => Promise<void>;
	onShowPage: (buttonInteraction: Djs.ButtonInteraction, page: number) => Promise<void>;
	onValidate: (buttonInteraction: Djs.ButtonInteraction) => Promise<void>;
	onCancel?: (buttonInteraction: Djs.ButtonInteraction) => Promise<void>;
	onEnd?: (buttonMessage: Djs.Message) => Promise<void> | void;
};

// Stockage partagé des states de pagination (clé arbitraire fournie par l'appelant)
const globalPaginationStates = new Map<string, PaginationState>();
const messageToStateKey = new Map<string, string>();

export function paginateIds(ids: string[], pageSize = 25): Record<number, string[]> {
	const paginated: Record<number, string[]> = {};
	if (ids.length === 0) return paginated;
	// If the total is a multiple of pageSize, create an extra empty page so the UI
	// can display a "next" page after a full page (user requirement).
	let pages = Math.ceil(ids.length / pageSize);
	if (ids.length % pageSize === 0) pages = pages + 1; // add empty trailing page
	for (let i = 0; i < pages; i++) {
		const startIndex = i * pageSize;
		const endIndex = startIndex + pageSize;
		paginated[i] = ids.slice(startIndex, endIndex);
	}
	return paginated;
}

export function createPaginationState(
	key: string,
	originalIds: string[],
	paginatedItems: Record<number, string[]>
): PaginationState {
	const state: PaginationState = {
		currentPage: 0,
		originalIds,
		paginatedItems,
		selectedIds: new Set(originalIds),
	};
	globalPaginationStates.set(key, state);
	return state;
}

export function getPaginationState(key: string): PaginationState | undefined {
	return globalPaginationStates.get(key);
}

export function deletePaginationState(key: string): void {
	globalPaginationStates.delete(key);
}

export function hasMorePages(
	paginatedItems: Record<number, string[]>,
	page = 0
): boolean {
	return Object.keys(paginatedItems).length > page + 1;
}

export async function startPaginatedButtonsFlow(
	params: {
		interaction:
			| Djs.ChatInputCommandInteraction
			| Djs.ButtonInteraction
			| Djs.ModalSubmitInteraction;
		userId: string;
		ul: Translation;
		initialContent: string;
		initialComponents: Djs.ActionRowBuilder<Djs.ButtonBuilder>[];
		timeout?: number;
		stateKey?: string; // optional key to link this message to a PaginationState
	},
	handlers: PaginatedHandlers
) {
	const {
		interaction,
		userId,
		ul,
		initialContent,
		initialComponents,
		timeout,
		stateKey,
	} = params;
	const t = timeout ?? TIMEOUT;

	await interaction.reply({
		components: initialComponents,
		content: initialContent,
		flags: Djs.MessageFlags.Ephemeral,
	});

	const buttonMessage = await interaction.fetchReply();
	if (stateKey && (buttonMessage as Djs.Message).id) {
		messageToStateKey.set((buttonMessage as Djs.Message).id, stateKey);
	}

	const collector = (buttonMessage as Djs.Message).createMessageComponentCollector({
		filter: (i: Djs.Interaction) => (i.user as Djs.User).id === userId,
		time: t,
	});

	collector.on("collect", async (buttonInteraction: Djs.ButtonInteraction) => {
		const customId = buttonInteraction.customId;

		try {
			// parse trailing integer more robustly
			const match = customId.match(/(\d+)$/);
			const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;

			// try to find linked state
			const msgId = (buttonInteraction.message as Djs.Message).id;
			const linkedStateKey = messageToStateKey.get(msgId);
			const linkedState = linkedStateKey
				? globalPaginationStates.get(linkedStateKey)
				: undefined;

			if (customId.startsWith("page_modify_") || customId.includes("_page_modify_")) {
				const page = Number.isFinite(parsed) ? parsed : (linkedState?.currentPage ?? 0);
				await handlers.onModify(buttonInteraction, page);
			} else if (customId.startsWith("page_prev_") || customId.includes("_page_prev_")) {
				await buttonInteraction.deferUpdate();
				// use linked state's currentPage for navigation if available to avoid parsing mismatch
				const current =
					linkedState?.currentPage ?? (Number.isFinite(parsed) ? parsed : 0);
				const prevPage = Math.max(0, current - 1);
				await handlers.onShowPage(buttonInteraction, prevPage);
			} else if (customId.startsWith("page_next_") || customId.includes("_page_next_")) {
				await buttonInteraction.deferUpdate();
				// use linked state's currentPage for navigation if available to avoid parsing mismatch
				const current =
					linkedState?.currentPage ?? (Number.isFinite(parsed) ? parsed : 0);
				const nextPage = current + 1;
				await handlers.onShowPage(buttonInteraction, nextPage);
			} else if (customId.endsWith("_page_validate") || customId === "page_validate") {
				await buttonInteraction.deferUpdate();
				await handlers.onValidate(buttonInteraction);
				collector.stop();
			} else if (customId.endsWith("_page_cancel") || customId === "page_cancel") {
				await buttonInteraction.deferUpdate();
				if (handlers.onCancel) {
					await handlers.onCancel(buttonInteraction);
				} else {
					await buttonInteraction.editReply({
						components: [],
						content: ul("common.cancelled"),
					});
				}
				collector.stop();
			}
		} catch (e) {
			console.error("Error handling paginated button interaction:", e);
		}
	});

	collector.on("end", async () => {
		// cleanup mapping
		try {
			const id = (buttonMessage as Djs.Message).id;
			if (messageToStateKey.has(id)) messageToStateKey.delete(id);
		} catch (e) {
			/* noop */
		}

		// Call onEnd if provided so caller can cleanup state and remove components
		try {
			if (handlers.onEnd) {
				// handlers.onEnd may be async; don't await here to avoid blocking the collector end
				Promise.resolve(handlers.onEnd(buttonMessage as Djs.Message)).catch((e) => {
					console.error("Error in onEnd handler for paginated flow:", e);
				});
			} else {
				// Default: remove components to disable buttons
				try {
					await (buttonMessage as Djs.Message)
						.edit({ components: [] })
						.catch(() => undefined);
				} catch (e) {
					/* noop */
				}
			}
		} catch (e) {
			console.error("Error in onEnd handler for paginated flow:", e);
		}
	});
}

export function createPaginationButtons(
	mode: "follow" | "ignore",
	page: number,
	hasMore: boolean,
	ul: (key: string) => string
): import("discord.js").ActionRowBuilder<import("discord.js").ButtonBuilder>[] {
	const buttons: import("discord.js").ButtonBuilder[] = [];

	// Bouton modifier (ouvre le modal pour cette page)
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_modify_${page}`)
			.setLabel(ul("common.modify"))
			.setEmoji("✏️")
			.setStyle(Djs.ButtonStyle.Primary)
	);

	// Bouton page précédente (disabled si page 0)
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_prev_${page}`)
			.setLabel(`${ul("common.previous")}`)
			.setEmoji("◀️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setDisabled(page === 0)
	);

	// Bouton page suivante (disabled si pas de suite)
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_next_${page}`)
			.setLabel(`${ul("common.next")}`)
			.setEmoji("➡️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setDisabled(!hasMore)
	);

	// Bouton valider (toujours actif)
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_validate`)
			.setLabel(ul("common.validate"))
			.setEmoji("✅")
			.setStyle(Djs.ButtonStyle.Success)
	);

	// Bouton annuler
	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_cancel`)
			.setLabel(ul("common.cancel"))
			.setEmoji("❌")
			.setStyle(Djs.ButtonStyle.Danger)
	);

	return [new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(buttons)];
}
