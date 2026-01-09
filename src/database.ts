import { Locale } from "discord.js";
import Enmap from "enmap";
import {
	DEFAULT_CONFIGURATION,
	DEFAULT_IGNORE_FOLLOW,
	type IgnoreFollow,
	type IgnoreFollowKey,
	type PaginatedIdsState,
	type RoleInPaginationState,
	type ServerData,
} from "./interfaces";
import { EMOJI } from "./interfaces/constant";

function getDefaultServerData(): ServerData {
	return {
		configuration: { ...DEFAULT_CONFIGURATION },
		follow: { ...DEFAULT_IGNORE_FOLLOW },
		ignore: { ...DEFAULT_IGNORE_FOLLOW },
		messageCache: {},
	};
}

export default {
	/**
	 * In-memory Enmap to track last update timestamps for caches
	 */
	cacheUpdateTimestamps: new Enmap<string, { lastUpdate: number }>({
		inMemory: true,
	}),
	messageToStateKey: new Enmap<string, string>({
		inMemory: true,
	}),
	globalPaginationStates: new Enmap<string, PaginatedIdsState>({
		inMemory: true,
	}),
	roleInStates: new Enmap<string, RoleInPaginationState>({
		inMemory: true,
	}),
	/**
	 * Main Enmap for server settings
	 */
	settings: new Enmap<string, ServerData, unknown>({
		autoEnsure: getDefaultServerData(),
		name: "Database",
	}),
	/**
	 * Default values for new guilds
	 */
	defaultValues: {
		configuration: { ...DEFAULT_CONFIGURATION },
		follow: { ...DEFAULT_IGNORE_FOLLOW },
		ignore: { ...DEFAULT_IGNORE_FOLLOW },
	},
	/*
	 * Useful methods
	 */

	clearMessageCache(guildId: string): void {
		this.settings.set(guildId, {}, "messageCache");
	},
	getAllFollowedChannels(guildId: string): string[] {
		const follow = this.settings.get(guildId, "follow");
		if (!follow) return [];

		const combined = [
			...(follow.forum ?? []),
			...(follow.channel ?? []),
			...(follow.category ?? []),
			...(follow.thread ?? []),
		];
		return Array.from(new Set(combined));
	},
	getLanguage(guildID: string): Locale {
		const language = this.settings.get(guildID, "configuration.language");
		return language ?? Locale.EnglishUS;
	},
	getMaps(
		maps: "follow" | "ignore",
		typeName: IgnoreFollowKey,
		guildID: string
	): string[] {
		const config = this.settings.get(guildID, maps) as IgnoreFollow;

		switch (typeName) {
			case "thread": {
				return (config?.thread as string[]) ?? [];
			}
			case "category":
				return (config?.category as string[]) ?? [];
			case "channel":
				return (config?.channel as string[]) ?? [];
			case "forum":
				return (config?.forum as string[]) ?? [];
			default:
				return [];
		}
	},
	getMessageToSend(guildID: string) {
		const message = this.settings.get(guildID, "configuration.messageToSend");
		return message ?? EMOJI;
	},

	loadDBFirstTime(guild: string): void {
		if (!this.settings.has(guild)) {
			this.settings.set(guild, getDefaultServerData());
		}
	},

	setTrackedItem(
		mode: "follow" | "ignore",
		name: IgnoreFollowKey,
		guildID: string,
		value: string[]
	): void {
		/**
		 * For roleIn, use `set(guildId, value, mode.onlyRoleIn)` directly
		 */
		if (name === "onlyRoleIn") return;
		this.settings.set(guildID, value, `${mode}.${name}`);
	},
};
