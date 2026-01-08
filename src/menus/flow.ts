import * as Djs from "discord.js";
import { TIMEOUT, type Translation } from "../interface";
import {
	DEFAULT_TTL_MS,
	globalPaginationStates,
	messageToStateKey,
	type PaginatedHandlers,
	type PaginatedIdsState,
	SWEEP_INTERVAL_MS,
} from "./interfaces";

/**
 * Generic sweep scheduler factory for Maps with items that have expiresAt property
 * Can be used by multiple modules with different state maps
 * @param intervalMs Interval in milliseconds for the sweep
 * @returns A scheduler function that can be called with a state map
 */
export function createSweepScheduler<T extends { expiresAt?: number }>(
	intervalMs = SWEEP_INTERVAL_MS
) {
	let scheduled = false;
	return function scheduleSweep(
		stateMap: Map<string, T>,
		onExpire?: (key: string, state: T) => void
	) {
		if (scheduled) return;
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(() => {
			const now = Date.now();
			for (const [key, state] of stateMap.entries()) {
				if (state.expiresAt && state.expiresAt <= now) {
					stateMap.delete(key);
					if (onExpire) onExpire(key, state);
				}
			}
		}, intervalMs);
		scheduled = true;
	};
}

let sweepScheduled = false;
function scheduleSweep() {
	if (sweepScheduled) return;
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	setInterval(() => {
		const now = Date.now();
		for (const [key, state] of globalPaginationStates.entries()) {
			if (state.expiresAt && state.expiresAt <= now) {
				// delete state and related message mappings
				globalPaginationStates.delete(key);
				for (const [msgId, mapping] of messageToStateKey.entries()) {
					if (mapping.stateKey === key) messageToStateKey.delete(msgId);
				}
			}
		}
		// also cleanup any message mappings that expired without a state (defensive)
		for (const [msgId, mapping] of messageToStateKey.entries()) {
			if (mapping.expiresAt && mapping.expiresAt <= now) messageToStateKey.delete(msgId);
		}
	}, SWEEP_INTERVAL_MS);
	sweepScheduled = true;
}

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
): PaginatedIdsState {
	const ttl = DEFAULT_TTL_MS;
	const state: PaginatedIdsState = {
		currentPage: 0,
		expiresAt: Date.now() + ttl,
		originalIds,
		paginatedItems,
		selectedIds: new Set(originalIds),
		ttlMs: ttl,
	};
	globalPaginationStates.set(key, state);
	// ensure sweep runs
	scheduleSweep();
	return state;
}

export function getPaginationState(key: string): PaginatedIdsState | undefined {
	const state = globalPaginationStates.get(key);
	if (!state) return undefined;
	const now = Date.now();
	if (state.expiresAt && state.expiresAt <= now) {
		// expired
		globalPaginationStates.delete(key);
		// cleanup message mappings referencing this state
		for (const [msgId, mapping] of messageToStateKey.entries()) {
			if (mapping.stateKey === key) messageToStateKey.delete(msgId);
		}
		return undefined;
	}
	// sliding expiration: extend on access
	if (state.ttlMs) state.expiresAt = Date.now() + state.ttlMs;
	return state;
}

export function deletePaginationState(key: string): void {
	globalPaginationStates.delete(key);
	for (const [msgId, mapping] of messageToStateKey.entries()) {
		if (mapping.stateKey === key) messageToStateKey.delete(msgId);
	}
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
	});

	const buttonMessage = await interaction.fetchReply();
	if (stateKey && buttonMessage.id) {
		// link the message ID to the state key and mirror the state's expiration if present
		const state = getPaginationState(stateKey);
		messageToStateKey.set(buttonMessage.id, {
			expiresAt: state?.expiresAt,
			stateKey,
		});
	}

	const collector = buttonMessage.createMessageComponentCollector({
		componentType: Djs.ComponentType.Button,
		filter: (i: Djs.Interaction) => i.user.id === userId,
		time: t,
	});

	collector.on("collect", async (buttonInteraction) => {
		const customId = buttonInteraction.customId;

		try {
			// parse trailing integer more robustly
			const match = customId.match(/(\d+)$/);
			const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;

			// try to find linked state
			const msgId = (buttonInteraction.message as Djs.Message).id;
			const linkedStateKey = messageToStateKey.get(msgId)?.stateKey;
			// use getPaginationState to respect TTL and sliding expiration
			const linkedState = linkedStateKey ? getPaginationState(linkedStateKey) : undefined;

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
				try {
					await handlers.onEnd(buttonMessage);
				} catch (e) {
					console.warn("Error in onEnd handler for paginated flow:", e);
				}
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
) {
	const buttons = [];

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_modify_${page}`)
			.setLabel(ul("common.modify"))
			.setEmoji("✏️")
			.setStyle(Djs.ButtonStyle.Primary)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_prev_${page}`)
			.setLabel(`${ul("common.previous")}`)
			.setEmoji("◀️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setDisabled(page === 0)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_next_${page}`)
			.setLabel(`${ul("common.next")}`)
			.setEmoji("➡️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setDisabled(!hasMore)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_validate`)
			.setLabel(ul("common.validate"))
			.setEmoji("✅")
			.setStyle(Djs.ButtonStyle.Success)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_cancel`)
			.setLabel(ul("common.cancel"))
			.setEmoji("❌")
			.setStyle(Djs.ButtonStyle.Danger)
	);

	return [new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(buttons)];
}

// ensure sweep scheduled when module is loaded
// Side effect: Start the background sweep timer when this module is imported.
// This ensures expired pagination states are cleaned up even if no flows are active.
// ensure sweep scheduled when module is loaded
scheduleSweep();
