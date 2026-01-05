import Enmap from "enmap";
import {
	CommandName,
	DEFAULT_CONFIGURATION,
	DEFAULT_IGNORE_FOLLOW,
	type IgnoreFollow,
	type RoleIn,
	type ServerData,
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
 * Get cached bot message ID for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 * @returns The cached message ID or undefined
 */
export function getCachedMessage(guildId: string, threadId: string): string | undefined {
	const serverData = serverDataDb.ensure(guildId, getDefaultServerData());
	return serverData.messageCache[threadId];
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
	const serverData = serverDataDb.ensure(guildId, getDefaultServerData());
	serverData.messageCache[threadId] = messageId;
	serverDataDb.set(guildId, serverData);
}

/**
 * Delete cached bot message for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 */
export function deleteCachedMessage(guildId: string, threadId: string): void {
	const serverData = serverDataDb.ensure(guildId, getDefaultServerData());
	delete serverData.messageCache[threadId];
	serverDataDb.set(guildId, serverData);
}

/**
 * Delete all cached messages for a guild
 * @param guildId The guild ID
 */
export function clearGuildMessageCache(guildId: string): void {
	const serverData = serverDataDb.ensure(guildId, getDefaultServerData());
	serverData.messageCache = {};
	serverDataDb.set(guildId, serverData);
}

/**
 * Get default ServerData structure
 */
function getDefaultServerData(): ServerData {
	return {
		configuration: DEFAULT_CONFIGURATION,
		follow: DEFAULT_IGNORE_FOLLOW,
		ignore: DEFAULT_IGNORE_FOLLOW,
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
	if (name === CommandName.manualMode) return;
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	(serverData.configuration as Record<string, string | boolean>)[name] = value;
	serverDataDb.set(guildID, serverData);
}

/**
 * Set value in ignore configuration
 */
export function setIgnore<T extends keyof IgnoreFollow>(
	name: T,
	guildID: string,
	value: IgnoreFollow[T]
): void {
	if (name === TypeName.OnlyRoleIn) return;
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	serverData.ignore[name] = value;
	serverDataDb.set(guildID, serverData);
}

/**
 * Set value in follow configuration
 */
export function setFollow<T extends keyof IgnoreFollow>(
	name: T,
	guildID: string,
	value: IgnoreFollow[T]
): void {
	if (name === TypeName.OnlyRoleIn) return;
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	serverData.follow[name] = value;
	serverDataDb.set(guildID, serverData);
}

/**
 * Set role list for ignore or follow
 */
export function setRole(on: "follow" | "ignore", guildID: string, value: string[]): void {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	if (on === "follow") {
		serverData.follow[TypeName.role] = value;
	} else {
		serverData.ignore[TypeName.role] = value;
	}
	serverDataDb.set(guildID, serverData);
}

/**
 * Set RoleIn configuration for ignore or follow
 */
export function setRoleIn(
	on: "follow" | "ignore",
	guildID: string,
	value: RoleIn[]
): void {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	if (on === "follow") {
		serverData.follow[TypeName.OnlyRoleIn] = value;
	} else {
		serverData.ignore[TypeName.OnlyRoleIn] = value;
	}
	serverDataDb.set(guildID, serverData);
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
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());

	// If looking for a specific channel (e.g., for logs)
	if (channel) {
		const channelValue = (serverData.configuration as Record<string, unknown>)[
			`${name}.channel`
		];
		if (channelValue !== undefined && channelValue !== null) {
			return channelValue as string;
		}
		return "";
	}

	// Retrieve the configuration value
	const value = serverData.configuration[name];

	// If the value exists, return it
	if (value !== undefined && value !== null) {
		return value as string | boolean;
	}

	// Otherwise, set and return the default value based on command type
	const defaultValue = ![
		CommandName.manualMode,
		CommandName.followOnlyChannel,
		CommandName.followOnlyRole,
		CommandName.followOnlyRoleIn,
		CommandName.log,
	].includes(name);

	setConfig(name, guildID, defaultValue);
	return defaultValue;
}

/**
 * Get RoleIn list for ignore or follow
 */
export function getRoleIn(ignore: "follow" | "ignore", guildID: string): RoleIn[] {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	const config = ignore === "follow" ? serverData.follow : serverData.ignore;
	return (config[TypeName.OnlyRoleIn] as RoleIn[]) ?? [];
}

/**
 * Get role ID list for ignore or follow
 */
export function getRole(ignore: "follow" | "ignore", guildID: string): string[] {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	const config = ignore === "follow" ? serverData.follow : serverData.ignore;
	return (config[TypeName.role] as string[]) ?? [];
}

/**
 * Get channel/category/forum/thread IDs for ignore or follow
 */
export function getMaps(
	maps: "follow" | "ignore",
	typeName: TypeName,
	guildID: string
): string[] {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	const config = maps === "follow" ? serverData.follow : serverData.ignore;

	switch (typeName) {
		case TypeName.thread:
			return (config[TypeName.thread] as string[]) ?? [];
		case TypeName.category:
			return (config[TypeName.category] as string[]) ?? [];
		case TypeName.channel:
			return (config[TypeName.channel] as string[]) ?? [];
		case TypeName.forum:
			return (config[TypeName.forum] as string[]) ?? [];
		default:
			return [];
	}
}

/**
 * Get language for a guild
 */
export function getLanguage(guildID: string): string {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	return (serverData.configuration.language as string) ?? "en-US";
}

/**
 * Get all followed channel IDs (all types combined)
 */
export function getAllFollowedChannels(guildId: string): string[] {
	const serverData = serverDataDb.ensure(guildId, getDefaultServerData());
	const follow = serverData.follow;

	return [
		...(follow[TypeName.forum] ?? []),
		...(follow[TypeName.channel] ?? []),
		...(follow[TypeName.category] ?? []),
		...(follow[TypeName.thread] ?? []),
	];
}

/**
 * Get message to send for a guild
 */
export function getMessageToSend(guildID: string): string {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	return (serverData.configuration.messageToSend as string) ?? "_ _";
}

/**
 * Get pin setting for a guild
 */
export function getPinSetting(guildID: string): boolean {
	const serverData = serverDataDb.ensure(guildID, getDefaultServerData());
	return (serverData.configuration.pin as boolean) ?? false;
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
	logInDev("Exporting DB");
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
