import type * as Djs from "discord.js";
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
export type PaginatedIdsState = {
	currentPage: number;
	originalIds: string[];
	paginatedItems: Record<number, string[]>;
	selectedIds: Set<string>;
	// Optional TTL fields managed by the pagination system
	ttlMs?: number;
	expiresAt?: number;
};
export type PaginatedHandlers = {
	onModify: (buttonInteraction: Djs.ButtonInteraction, page: number) => Promise<void>;
	onShowPage: (buttonInteraction: Djs.ButtonInteraction, page: number) => Promise<void>;
	onValidate: (buttonInteraction: Djs.ButtonInteraction) => Promise<void>;
	onCancel?: (buttonInteraction: Djs.ButtonInteraction) => Promise<void>;
	onEnd?: (buttonMessage: Djs.Message) => Promise<void> | void;
};
// global state maps
export const globalPaginationStates = new Map<string, PaginatedIdsState>();
// message id -> { stateKey, expiresAt }
export const messageToStateKey = new Map<
	string,
	{ stateKey: string; expiresAt?: number }
>();
export const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute
/**
 * Temporary state for paginated channel selection
 * Key: userId_guildId_mode (e.g., "123456789_987654321_follow")
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
	timestamp: number; // Pour cleanup automatique
}

export const paginationStates = new Map<string, UserGuildPaginationState>();
// Cleanup automatique après 10 minutes
export const CLEANUP_TIMEOUT = 10 * 60 * 1000;
