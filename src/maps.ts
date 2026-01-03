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
 * setConfig value in Emaps "ignore"
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
 * setConfig value in Emaps "followOnly"
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
 * Return "en" if CommandName.language is not setConfig
 * return true if value is not setConfig (for the other options)
 * @param {CommandName} name
 * @param guildID
 * @param channel
 */
export function getConfig(
	name: CommandName,
	guildID: string,
	channel?: boolean
): string | boolean {
	// Assure que la configuration existe pour la guilde
	optionMaps.ensure(guildID, DEFAULT_CONFIGURATION);

	// Si on cherche un canal spécifique (pour les logs par exemple)
	if (channel) {
		const channelPath = `${name}.channel`;
		const channelValue = optionMaps.get(guildID, channelPath);
		if (channelValue !== undefined && channelValue !== null) {
			return channelValue as string;
		}
		return "";
	}

	// Récupère la valeur de la configuration
	const value = optionMaps.get(guildID, name);

	// Si la valeur existe, la retourner
	if (value !== undefined && value !== null) {
		return value as string | boolean;
	}

	// Sinon, définir et retourner la valeur par défaut selon le type de commande
	switch (name) {
		case CommandName.manualMode:
		case CommandName.followOnlyChannel:
		case CommandName.followOnlyRole:
		case CommandName.followOnlyRoleIn:
		case CommandName.log:
			optionMaps.set(guildID, false, name);
			return false;
		default:
			// Pour les autres commandes (member, thread, channel, newMember)
			optionMaps.set(guildID, true, name);
			return true;
	}
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
	switch (maps) {
		case "follow":
			return getFollow(typeName, guildID);
		case "ignore":
			return getIgnored(typeName, guildID);
	}
}

/**
 * Get a value for the Emaps "FollowOnly"
 * @param follow {TypeName}
 * @param guildID
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getFollow(
	follow: TypeName,
	guildID: string
): ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[] {
	const followConfig = followOnlyMaps.ensure(
		guildID,
		DEFAULT_IGNORE_FOLLOW
	) as IgnoreFollow;
	if (!followConfig[follow]) {
		setFollow(follow, guildID, []);
	}
	switch (follow) {
		case TypeName.thread:
			return (followConfig[TypeName.thread] as ThreadChannel[]) ?? [];
		case TypeName.category:
			return (followConfig[TypeName.category] as CategoryChannel[]) ?? [];
		case TypeName.channel:
			return (followConfig[TypeName.channel] as TextChannel[]) ?? [];
		case TypeName.forum:
			return (followConfig[TypeName.forum] as ForumChannel[]) ?? [];
		default:
			return [];
	}
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
 * @param ignore {TypeName}
 * @param guildID
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getIgnored(
	ignore: TypeName,
	guildID: string
): ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[] {
	const ignoreConfig = ignoreMaps.ensure(guildID, DEFAULT_IGNORE_FOLLOW) as IgnoreFollow;
	if (!ignoreConfig[ignore]) {
		setIgnore(ignore, guildID, []);
	}
	switch (ignore) {
		case TypeName.thread:
			return (ignoreConfig[TypeName.thread] as ThreadChannel[]) ?? [];
		case TypeName.category:
			return (ignoreConfig[TypeName.category] as CategoryChannel[]) ?? [];
		case TypeName.channel:
			return (ignoreConfig[TypeName.channel] as TextChannel[]) ?? [];
		case TypeName.forum:
			return (ignoreConfig[TypeName.forum] as ForumChannel[]) ?? [];
		default:
			return [];
	}
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
