import type {
	CategoryChannel,
	ForumChannel,
	Role,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import Enmap from "enmap";
import {
	CommandName,
	type Configuration,
	DEFAULT_CONFIGURATION,
	DEFAULT_IGNORE_FOLLOW,
	type IgnoreFollow,
	type RoleIn,
	TypeName,
} from "./interface";
import { logInDev } from "./utils";

/**
 * Get cached bot message ID for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 * @returns The cached message ID or undefined
 */
export function getCachedMessage(guildId: string, threadId: string): string | undefined {
	return botMessageCache.get(guildId, threadId);
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
	botMessageCache.set(guildId, messageId, threadId);
}

/**
 * Delete cached bot message for a thread
 * @param guildId The guild ID
 * @param threadId The thread ID
 */
export function deleteCachedMessage(guildId: string, threadId: string): void {
	botMessageCache.delete(guildId, threadId);
}

/**
 * Delete all cached messages for a guild
 * @param guildId The guild ID
 */
export function clearGuildMessageCache(guildId: string): void {
	botMessageCache.delete(guildId);
}

export const optionMaps = new Enmap<string, Configuration>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Configuration",
});

const ignoreMaps = new Enmap<string, IgnoreFollow>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Ignore",
});
const followOnlyMaps = new Enmap<string, IgnoreFollow>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "FollowOnly",
});

/**
 * Cache for bot messages in threads
 * Structure: { guildId: { threadId: messageId } }
 */
const botMessageCache = new Enmap<string, Record<string, string>>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "BotMessageCache",
});

/**
 * Set a value in Emaps "configuration"
 * @param {CommandName} name
 * @param guildID
 * @param {string | boolean} value
 */
export function setConfig(
	name: CommandName | string,
	guildID: string,
	value: string | boolean
) {
	if (name === CommandName.manualMode) return;
	optionMaps.set(guildID, value, name);
}

/**
 * Set value in Emaps "ignore"
 */

export function setIgnore<T extends keyof IgnoreFollow>(
	name: T,
	guildID: string,
	value: IgnoreFollow[T]
) {
	const guildConfig = (ignoreMaps.get(guildID) as IgnoreFollow) ?? DEFAULT_IGNORE_FOLLOW;
	if (name === TypeName.OnlyRoleIn) return;
	guildConfig[name] = value;
	ignoreMaps.set(guildID, guildConfig);
}

/**
 * Set value in Emaps "followOnly"
 */

export function setFollow<T extends keyof IgnoreFollow>(
	name: T,
	guildID: string,
	value: IgnoreFollow[T]
) {
	const guildConfig =
		(followOnlyMaps.get(guildID) as IgnoreFollow) ?? DEFAULT_IGNORE_FOLLOW;
	if (name === TypeName.OnlyRoleIn) return;
	guildConfig[name] = value;
	followOnlyMaps.set(guildID, guildConfig);
}

export function setRole(on: "follow" | "ignore", guildID: string, value: Role[]) {
	if (on === "follow") {
		const guildConfig =
			(followOnlyMaps.get(guildID) as IgnoreFollow) ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.role] = value;
		followOnlyMaps.set(guildID, guildConfig);
	} else {
		const guildConfig =
			(ignoreMaps.get(guildID) as IgnoreFollow) ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.role] = value;
		ignoreMaps.set(guildID, guildConfig);
	}
}

export function setRoleIn(on: "follow" | "ignore", guildID: string, value: RoleIn[]) {
	if (on === "follow") {
		const guildConfig =
			(followOnlyMaps.get(guildID) as IgnoreFollow) ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.OnlyRoleIn] = value;
		followOnlyMaps.set(guildID, guildConfig);
	} else {
		const guildConfig =
			(ignoreMaps.get(guildID) as IgnoreFollow) ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.OnlyRoleIn] = value;
		ignoreMaps.set(guildID, guildConfig);
	}
}

/**
 * Get a value in the Emaps "configuration"
 * Return "en" if CommandName.language is not set
 * return true if value is not set (for the other options)
 * @param {CommandName} name
 * @param guildID
 * @param channel - If true, get channel configuration
 */
export function getConfig(name: CommandName, guildID: string, channel?: false): boolean;
export function getConfig(name: CommandName, guildID: string, channel: true): string;
export function getConfig(
	name: CommandName,
	guildID: string,
	channel?: boolean
): string | boolean {
	// Ensure configuration exists for the guild
	optionMaps.ensure(guildID, DEFAULT_CONFIGURATION);

	// If looking for a specific channel (e.g., for logs)
	if (channel) {
		const channelPath = `${name}.channel`;
		const channelValue = optionMaps.get(guildID, channelPath);
		if (channelValue !== undefined && channelValue !== null) {
			return channelValue as string;
		}
		return "";
	}

	// Retrieve the configuration value
	const value = optionMaps.get(guildID, name);

	// If the value exists, return it
	if (value !== undefined && value !== null) {
		return value as string | boolean;
	}

	// Otherwise, set and return the default value based on command type
	const defaultValue = [
		CommandName.manualMode,
		CommandName.followOnlyChannel,
		CommandName.followOnlyRole,
		CommandName.followOnlyRoleIn,
		CommandName.log,
	].includes(name)
		? false
		: true;

	optionMaps.set(guildID, defaultValue, name);
	return defaultValue;
}

export function getRoleIn(ignore: "follow" | "ignore", guildID: string): RoleIn[] {
	const ignoreConfig = ignoreMaps.ensure(guildID, DEFAULT_IGNORE_FOLLOW) as IgnoreFollow;
	const followConfig = followOnlyMaps.ensure(
		guildID,
		DEFAULT_IGNORE_FOLLOW
	) as IgnoreFollow;

	if (!ignoreConfig[TypeName.OnlyRoleIn] || !followConfig[TypeName.OnlyRoleIn]) {
		setRoleIn(ignore, guildID, []);
	}
	switch (ignore) {
		case "follow":
			return (followConfig[TypeName.OnlyRoleIn] as RoleIn[]) ?? [];
		case "ignore":
			return (ignoreConfig[TypeName.OnlyRoleIn] as RoleIn[]) ?? [];
	}
}

export function getRole(ignore: "follow" | "ignore", guildID: string): Role[] {
	const ignoreConfig = ignoreMaps.ensure(guildID, DEFAULT_IGNORE_FOLLOW) as IgnoreFollow;
	const followConfig = followOnlyMaps.ensure(
		guildID,
		DEFAULT_IGNORE_FOLLOW
	) as IgnoreFollow;

	if (!ignoreConfig[TypeName.role] || !followConfig[TypeName.role]) {
		setRole(ignore, guildID, []);
	}
	switch (ignore) {
		case "follow":
			return (followConfig[TypeName.role] as Role[]) ?? [];
		case "ignore":
			return (ignoreConfig[TypeName.role] as Role[]) ?? [];
	}
}

export function getMaps(
	maps: "follow" | "ignore",
	typeName: TypeName,
	guildID: string
): ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[] {
	return getMapValues(maps, typeName, guildID);
}

/**
 * Generic function to retrieve values from ignore or follow maps
 * @param mapType - Type of map to query ("follow" or "ignore")
 * @param typeName - Type of entity to retrieve
 * @param guildID - Guild identifier
 * @returns Array of channels/categories/forums/threads
 */
function getMapValues(
	mapType: "follow" | "ignore",
	typeName: TypeName,
	guildID: string
): ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[] {
	const map = mapType === "follow" ? followOnlyMaps : ignoreMaps;
	const config = map.ensure(guildID, DEFAULT_IGNORE_FOLLOW) as IgnoreFollow;

	if (!config[typeName]) {
		const setter = mapType === "follow" ? setFollow : setIgnore;
		setter(typeName, guildID, []);
	}

	switch (typeName) {
		case TypeName.thread:
			return (config[TypeName.thread] as ThreadChannel[]) ?? [];
		case TypeName.category:
			return (config[TypeName.category] as CategoryChannel[]) ?? [];
		case TypeName.channel:
			return (config[TypeName.channel] as TextChannel[]) ?? [];
		case TypeName.forum:
			return (config[TypeName.forum] as ForumChannel[]) ?? [];
		default:
			return [];
	}
}

/**
 * Get a value for the Emaps "FollowOnly"
 * @deprecated Use getMapValues instead
 * @param follow {TypeName}
 * @param guildID
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getFollow(
	follow: TypeName,
	guildID: string
): ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[] {
	return getMapValues("follow", follow, guildID);
}

export function getAllFollowedChannels(guildId: string) {
	const followConfig = followOnlyMaps.ensure(
		guildId,
		DEFAULT_IGNORE_FOLLOW
	) as IgnoreFollow;
	const followedForum = followConfig[TypeName.forum];
	const followedChannel = followConfig[TypeName.channel];
	const followedCategory = followConfig[TypeName.category];
	const followedThread = followConfig[TypeName.thread];
	//combine all arrays into one
	return [
		...(followedForum ?? []),
		...(followedChannel ?? []),
		...(followedCategory ?? []),
		...(followedThread ?? []),
	];
}

/**
 * Get a value for the Emaps "Ignore"
 * @deprecated Use getMapValues instead
 * @param ignore {TypeName}
 * @param guildID
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getIgnored(
	ignore: TypeName,
	guildID: string
): ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[] {
	return getMapValues("ignore", ignore, guildID);
}

export function destroyDB(): void {
	followOnlyMaps.deleteAll();
	ignoreMaps.deleteAll();
	optionMaps.deleteAll();
	console.log("Destroyed DB");
}

export function exportDB() {
	logInDev("Exporting DB");
	logInDev("FollowOnlyMaps", followOnlyMaps.export());
	logInDev("IgnoreMaps", ignoreMaps.export());
	logInDev("OptionMaps", optionMaps.export());
}

export function deleteGuild(id: string) {
	followOnlyMaps.delete(id);
	ignoreMaps.delete(id);
	optionMaps.delete(id);
}

export function loadDBFirstTime(guild: string) {
	followOnlyMaps.set(guild, DEFAULT_IGNORE_FOLLOW);
	ignoreMaps.set(guild, DEFAULT_IGNORE_FOLLOW);
	optionMaps.set(guild, DEFAULT_CONFIGURATION);
}
