import Enmap from "enmap";
import type { RoleIn, ServerData } from "./interface";
import {
	type CommandName,
	DEFAULT_CONFIGURATION,
	DEFAULT_IGNORE_FOLLOW,
	TypeName,
} from "./interface";
import { logInDev } from "./utils";

/**
 * Unified ServerData Enmap
 * Structure: { guildId: { configuration, ignore, follow, messageCache } }
 */
export const serverDataDb = new Enmap<string, ServerData>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Database",
});

/**
 * Ensure a guild entry exists; if absent, initialize defaults.
 */
function ensureGuild(guildID: string): void {
	if (!serverDataDb.has(guildID)) {
		serverDataDb.set(guildID, getDefaultServerData());
	}
}

/**
 * Get cached bot message ID for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 * @returns The cached message ID or undefined
 */
export function getCachedMessage(guildId: string, threadId: string): string | undefined {
	ensureGuild(guildId);
	return serverDataDb.get(guildId, `messageCache.${threadId}`);
}

/**
 * Cache a bot message ID for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 * @param messageId The message ID to cache
 */
export function setCachedMessage(
	guildId: string,
	threadId: string,
	messageId: string
): void {
	ensureGuild(guildId);
	serverDataDb.set(guildId, messageId, `messageCache.${threadId}`);
}

/**
 * Delete cached bot message for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 */
export function deleteCachedMessage(guildId: string, threadId: string): void {
	serverDataDb.delete(guildId, `messageCache.${threadId}`);
}

/**
 * Delete all cached messages for a guild
 * @param guildId The guild ID
 */
export function clearGuildMessageCache(guildId: string): void {
	ensureGuild(guildId);
	serverDataDb.set(guildId, {}, "messageCache");
}

/**
 * Get default ServerData structure
 */
function getDefaultServerData(): ServerData {
	return {
		configuration: DEFAULT_CONFIGURATION,
		follow: { ...DEFAULT_IGNORE_FOLLOW },
		ignore: { ...DEFAULT_IGNORE_FOLLOW },
		messageCache: {},
	};
}

/**
 * Set a value in configuration
 * @param name Configuration key
 * @param guildID Guild ID
 * @param value Configuration value
 */
export function setConfig(
	name: CommandName | string,
	guildID: string,
	value: string | boolean
): void {
	// allow manualMode to be stored as well
	ensureGuild(guildID);
	serverDataDb.set(guildID, value, `configuration.${name}`);
}

/**
 * Set value in follow or ignore configuration (unified function)
 */
export function setTrackedItem(
	mode: "follow" | "ignore",
	name: TypeName,
	guildID: string,
	value: string[]
): void {
	if (name === TypeName.OnlyRoleIn) return;
	ensureGuild(guildID);
	serverDataDb.set(guildID, value, `${mode}.${name}`);
}

/**
 * Set role list for ignore or follow
 */
export function setRole(on: "follow" | "ignore", guildID: string, value: string[]): void {
	ensureGuild(guildID);
	serverDataDb.set(guildID, value, `${on}.${TypeName.role}`);
}

/**
 * Set RoleIn configuration for ignore or follow
 */
export function setRoleIn(
	on: "follow" | "ignore",
	guildID: string,
	value: RoleIn[]
): void {
	ensureGuild(guildID);
	serverDataDb.set(guildID, value, `${on}.${TypeName.OnlyRoleIn}`);
}

/**
 * Get a value from configuration
 * Return "en" if CommandName.language is not set
 * return true if value is not set (for the other options)
 * @param name Configuration key
 * @param guildID Guild ID
 * @param channel - If true, get channel configuration
 */
export function getConfig(name: CommandName, guildID: string, channel?: false): boolean;
export function getConfig(name: CommandName, guildID: string, channel: true): string;
export function getConfig(
	name: CommandName,
	guildID: string,
	channel?: boolean
): string | boolean {
	ensureGuild(guildID);

	// If looking for a specific channel (e.g., for logs)
	if (channel) {
		const channelValue = serverDataDb.get(guildID, `configuration.${name}.channel`);
		return (channelValue as string | undefined) ?? "";
	}

	// Retrieve the configuration value
	const value = serverDataDb.get(guildID, `configuration.${name}`);

	// If the value exists, return it
	if (value !== undefined && value !== null) {
		return value as string | boolean;
	}

	const defaultConfiguration = getDefaultServerData();
	// Otherwise, set and return the default value based on command type
	const defaultValue = defaultConfiguration.configuration[name];

	setConfig(name, guildID, defaultValue);
	return defaultValue;
}

/**
 * Get RoleIn list for ignore or follow
 */
export function getRoleIn(ignore: "follow" | "ignore", guildID: string): RoleIn[] {
	ensureGuild(guildID);
	const roleIn = serverDataDb.get(guildID, `${ignore}.${TypeName.OnlyRoleIn}`) as
		| RoleIn[]
		| undefined;
	return roleIn ?? [];
}

/**
 * Get role ID list for ignore or follow
 */
export function getRole(ignore: "follow" | "ignore", guildID: string): string[] {
	ensureGuild(guildID);
	const roles = serverDataDb.get(guildID, `${ignore}.${TypeName.role}`) as
		| string[]
		| undefined;
	return roles ?? [];
}

/**
 * Get channel/category/forum/thread IDs for ignore or follow
 */
export function getMaps(
	maps: "follow" | "ignore",
	typeName: TypeName,
	guildID: string
): string[] {
	console.log(`[getMaps] Called with maps="${maps}", typeName="${typeName}"`);
	ensureGuild(guildID);
	const config = serverDataDb.get(guildID, maps) as ServerData["follow"];

	console.log(`[getMaps] Using config from serverData.${maps}:`, {
		hasCategory: !!config?.[TypeName.category],
		hasChannel: !!config?.[TypeName.channel],
		hasForum: !!config?.[TypeName.forum],
		hasThread: !!config?.[TypeName.thread],
	});

	switch (typeName) {
		case TypeName.thread: {
			const threads = (config?.[TypeName.thread] as string[]) ?? [];
			console.log(`[getMaps] Returning ${threads.length} threads for ${maps}`);
			return threads;
		}
		case TypeName.category:
			return (config?.[TypeName.category] as string[]) ?? [];
		case TypeName.channel:
			return (config?.[TypeName.channel] as string[]) ?? [];
		case TypeName.forum:
			return (config?.[TypeName.forum] as string[]) ?? [];
		default:
			return [];
	}
}

/**
 * Get language for a guild
 */
export function getLanguage(guildID: string): string {
	ensureGuild(guildID);
	const language = serverDataDb.get(guildID, "configuration.language") as
		| string
		| undefined;
	return language ?? "en-US";
}

/**
 * Get all followed channel IDs (all types combined)
 */
export function getAllFollowedChannels(guildId: string): string[] {
	ensureGuild(guildId);
	const forums = serverDataDb.get(guildId, `follow.${TypeName.forum}`) as
		| string[]
		| undefined;
	const channels = serverDataDb.get(guildId, `follow.${TypeName.channel}`) as
		| string[]
		| undefined;
	const categories = serverDataDb.get(guildId, `follow.${TypeName.category}`) as
		| string[]
		| undefined;
	const threads = serverDataDb.get(guildId, `follow.${TypeName.thread}`) as
		| string[]
		| undefined;
	return [
		...(forums ?? []),
		...(channels ?? []),
		...(categories ?? []),
		...(threads ?? []),
	];
}

/**
 * Get message to send for a guild
 */
export function getMessageToSend(guildID: string): string {
	ensureGuild(guildID);
	const message = serverDataDb.get(guildID, "configuration.messageToSend") as
		| string
		| undefined;
	return message ?? "_ _";
}

/**
 * Get pin setting for a guild
 */
export function getPinSetting(guildID: string): boolean {
	ensureGuild(guildID);
	const pin = serverDataDb.get(guildID, "configuration.pin") as boolean | undefined;
	return pin ?? false;
}

/**
 * Destroy the entire database
 */
export function destroyDB(): void {
	serverDataDb.deleteAll();
	console.log("Destroyed DB");
}

/**
 * Export database for backup
 */
export function exportDB(): string {
	console.info("Exporting DB");
	return serverDataDb.export();
}

/**
 * Delete all data for a guild
 */
export function deleteGuild(id: string): void {
	serverDataDb.delete(id);
}

/**
 * Initialize a guild with default data
 */
export function loadDBFirstTime(guild: string): void {
	serverDataDb.set(guild, getDefaultServerData());
}
