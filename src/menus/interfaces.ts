import type * as Djs from "discord.js";
import Enmap from "enmap";
import type { TChannel, Translation } from "../interface";

export type CommandMode = "follow" | "ignore";

export interface TrackedItems {
	categories: string[];
	channels: string[];
	forums: string[];
	roles: string[];
	threads: string[];
}

export type ChannelSelectorsForTypeOptions = {
	interaction: Djs.ChatInputCommandInteraction;
	ul: Translation;
	channelType: TChannel;
	mode: CommandMode;
};
/**
 * Per-interaction ephemeral pagination state used for message-driven pagination flows.
 *
 * Lifecycle & usage:
 * - Created for a single interactive pagination session (usually tied to a message
 *   or interaction). Stored in `globalPaginationStates` and referenced from
 *   `messageToStateKey` so message button interactions can resolve the state.
 * - Cleaned up automatically when the message collector ends (timeout or stop).
 *
 * Data shape notes:
 * - `originalIds` keeps the canonical ordered list of ids used to build pages.
 * - `paginatedItems` maps page numbers to the slice of ids shown on that page.
 * - `selectedIds` is a single, generic Set of selected item ids (useful when the
 *   paginated list is homogeneous — e.g. a list of channel ids or thread ids).
 */
export type PaginatedIdsState = {
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

// Global state storage using in-memory Enmap (no name = no persistence)
export const globalPaginationStates = new Enmap<string, PaginatedIdsState>();

// Message ID -> state key mapping
export const messageToStateKey = new Enmap<string, string>();

/**
 * Persistent per-user-per-guild selection state.
 *
 * Lifecycle & usage:
 * - Intended to persist a user's multi-step selection within a guild across
 *   multiple paginated interactions. Keyed by `userId_guildId_mode` and stored in
 *   `paginationStates` so the selection can survive opening/closing of paginated
 *   messages within the same logical flow.
 * - Cleanup is performed based on `timestamp` (see `CLEANUP_TIMEOUT`). This state
 *   is not meant to be long-term storage, but rather a short-lived session store
 *   scoped to a user + guild + command mode.
 *
 * Data shape notes:
 * - Uses typed Sets (`selectedCategories`, `selectedChannels`, etc.) when the
 *   flow needs to distinguish types of selections. This prevents id collisions
 *   and makes intent explicit (e.g., a category id vs a channel id).
 * - Use `UserGuildPaginationState` when a flow requires preserving typed
 *   selections across interactions. Use `PaginatedIdsState.selectedIds` when the
 *   paginated content is homogeneous and a single Set of ids is sufficient.
 */
export interface UserGuildPaginationState {
	userId: string;
	guildId: string;
	mode: "follow" | "ignore";
	currentPage: number;
	selectedCategories: Set<string>;
	selectedChannels: Set<string>;
	selectedThreads: Set<string>;
	selectedForums: Set<string>;
	timestamp: number; // Automatic cleanup
}

export const paginationStates = new Enmap<string, UserGuildPaginationState>();

/**
 * Follow or ignore roles in specific channels using a modal
 * @param on {"follow" | "ignore"} The mode to use
 */
export type RoleInPaginationState = {
	userId: string;
	guildId: string;
	mode: CommandMode;
	roleId: string;
	currentPage: number;
	selectedCategories: Set<string>;
	selectedChannels: Set<string>;
	selectedThreads: Set<string>;
	selectedForums: Set<string>;
};
// Use an in-memory Enmap for roleIn pagination states (no name = no persistence)
export const roleInStates = new Enmap<string, RoleInPaginationState>();

export interface PaginatedChannelSelectorsOptions {
	interaction: Djs.ChatInputCommandInteraction;
	ul: Translation;
	channelType: TChannel;
	mode: CommandMode;
	trackedIds: string[];
	stateKeyPrefix: string;
	modalLabel: string | undefined;
	summaryPrefix: string;
	onValidateCallback: (
		buttonInteraction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
		userId: string,
		guildID: string,
		channelType: TChannel,
		trackedIds: string[],
		ul: Translation,
		mode: CommandMode
	) => Promise<void>;
}
