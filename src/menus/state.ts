import {
	CLEANUP_TIMEOUT,
	DEFAULT_TTL_MS,
	paginationStates,
	type UserGuildPaginationState,
} from "./interfaces";

/**
 * Create or get pagination state
 */
export function getPaginationState(
	userId: string,
	guildId: string,
	mode: "follow" | "ignore"
): UserGuildPaginationState {
	const key = `${userId}_${guildId}_${mode}`;
	let state = paginationStates.get(key);

	if (!state) {
		// Lazily start the cleanup interval on first state creation
		startCleanupIntervalIfNeeded();

		state = {
			currentPage: 0,
			guildId,
			mode,
			selectedCategories: new Set(),
			selectedChannels: new Set(),
			selectedForums: new Set(),
			selectedThreads: new Set(),
			timestamp: Date.now(),
			userId,
		};
		paginationStates.set(key, state);
	}

	state.timestamp = Date.now();
	return state;
}

/**
 * Initialize pagination state with current tracked items
 */
export function initializePaginationState(
	userId: string,
	guildId: string,
	mode: "follow" | "ignore",
	currentItems: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	}
): UserGuildPaginationState {
	// Lazily start the cleanup interval on first state creation
	startCleanupIntervalIfNeeded();

	const key = `${userId}_${guildId}_${mode}`;
	const state: UserGuildPaginationState = {
		currentPage: 0,
		guildId,
		mode,
		selectedCategories: new Set(currentItems.categories),
		selectedChannels: new Set(currentItems.channels),
		selectedForums: new Set(currentItems.forums),
		selectedThreads: new Set(currentItems.threads),
		timestamp: Date.now(),
		userId,
	};
	paginationStates.set(key, state);
	return state;
}

/**
 * Update pagination state with new selections from a page
 */
export function updatePaginationState(
	userId: string,
	guildId: string,
	mode: "follow" | "ignore",
	page: number,
	newSelections: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	}
): void {
	const state = getPaginationState(userId, guildId, mode);
	state.currentPage = page;

	for (const id of newSelections.categories) {
		state.selectedCategories.add(id);
	}
	for (const id of newSelections.channels) {
		state.selectedChannels.add(id);
	}
	for (const id of newSelections.threads) {
		state.selectedThreads.add(id);
	}
	for (const id of newSelections.forums) {
		state.selectedForums.add(id);
	}

	state.timestamp = Date.now();
}

/**
 * Remove selections from state (when user deselects)
 */
export function removeFromPaginationState(
	userId: string,
	guildId: string,
	mode: "follow" | "ignore",
	removedSelections: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	}
): void {
	const state = getPaginationState(userId, guildId, mode);

	for (const id of removedSelections.categories) {
		state.selectedCategories.delete(id);
	}
	for (const id of removedSelections.channels) {
		state.selectedChannels.delete(id);
	}
	for (const id of removedSelections.threads) {
		state.selectedThreads.delete(id);
	}
	for (const id of removedSelections.forums) {
		state.selectedForums.delete(id);
	}

	state.timestamp = Date.now();
}

/**
 * Clear pagination state
 */
export function clearPaginationState(
	userId: string,
	guildId: string,
	mode: "follow" | "ignore"
): void {
	const key = `${userId}_${guildId}_${mode}`;
	paginationStates.delete(key);
}

/**
 * Cleanup old states (called periodically)
 */
export function cleanupOldStates(): void {
	const now = Date.now();
	for (const [key, state] of paginationStates.entries()) {
		if (now - state.timestamp > CLEANUP_TIMEOUT) {
			paginationStates.delete(key);
		}
	}
}

// Cleanup interval ID - starts lazily on first state creation
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * Start the cleanup interval lazily on first pagination state creation
 * This avoids running cleanup when no states are ever created
 */
function startCleanupIntervalIfNeeded(): void {
	if (cleanupIntervalId === null) {
		cleanupIntervalId = setInterval(cleanupOldStates, DEFAULT_TTL_MS);
	}
}

/**
 * Stop the automatic cleanup interval
 * Call this when shutting down or reloading the module to prevent memory leaks
 */
export function stopCleanupInterval(): void {
	if (cleanupIntervalId !== null) {
		clearInterval(cleanupIntervalId);
		cleanupIntervalId = null;
	}
}
