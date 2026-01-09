import type * as Djs from "discord.js";
import type { TChannel, Translation } from "./config";

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

export const TIMEOUT = 600000; // 10 minutes
