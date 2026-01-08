import {
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

