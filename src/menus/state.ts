import {
	globalPaginationStates,
	messageToStateKey,
	type PaginatedIdsState,
} from "./interfaces";

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
	const state: PaginatedIdsState = {
		originalIds,
		paginatedItems,
		selectedIds: new Set(originalIds),
	};
	globalPaginationStates.set(key, state);
	return state;
}

export function getPaginationState(key: string): PaginatedIdsState | undefined {
	return globalPaginationStates.get(key);
}

export function deletePaginationState(key: string): void {
	globalPaginationStates.delete(key);
	for (const [msgId, stateKey] of messageToStateKey.entries())
		if (stateKey === key) messageToStateKey.delete(msgId);
}
