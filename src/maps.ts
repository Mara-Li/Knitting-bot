import { CategoryChannel, ForumChannel, Role, TextChannel, ThreadChannel } from "discord.js";
import Enmap from "enmap";
import {
	CommandName,
	Configuration,
	DEFAULT_CONFIGURATION,
	DEFAULT_IGNORE_FOLLOW,
	IgnoreFollow,
	RoleIn,
	TypeName,
} from "./interface";
import { logInDev } from "./utils";

export const optionMaps = new Enmap({
	name: "Configuration",
	fetchAll: false,
	autoFetch: true,
	cloneLevel: "deep",
});

export const translationLanguage = optionMaps.get("language") || "en";
const ignoreMaps = new Enmap({ name: "Ignore",
	fetchAll: false,
	autoFetch: true,
	cloneLevel: "deep",
});
const followOnlyMaps = new Enmap({
	name: "FollowOnly",
	fetchAll: false,
	autoFetch: true,
	cloneLevel: "deep",
});


/**
 * Maps :
 * - Configuration {
 *     guildID: {
 *         commandName: value
 *         ...
 *     }
 * }
 * où GuildID = id du serveur
 * - Ignore {
 *    guildID: {
 *    typeName: [channelID, ...]
 *    }
 *    ...
 *    }
 * - FollowOnly {
 *   guildID: {
 *      ....
 *      }
 *      }
 */




/**
 * Set a value in Emaps "configuration"
 * @param {CommandName} name
 * @param guildID
 * @param {string | boolean} value
 */
export function setConfig(
	name: CommandName,
	guildID: string,
	value: string 
	| boolean
) {
	const guildConfig = optionMaps.get(guildID) as Configuration ?? DEFAULT_CONFIGURATION;
	if (name === CommandName.manualMode) return;
	guildConfig[name as keyof Configuration] = value;
	optionMaps.set(guildID, guildConfig);
	logInDev(`Set ${name} to ${value}`);
}

/**
 * setConfig value in Emaps "ignore"
 */

export function setIgnore<T extends keyof IgnoreFollow>(
	name: T,
	guildID: string,
	value: IgnoreFollow[T]
) {
	const guildConfig = ignoreMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
	if (name === TypeName.OnlyRoleIn) return;
	guildConfig[name] = value;
	ignoreMaps.set(guildID, guildConfig);
	logInDev(`Set ${name}`,
		value.map((v) => {
			if (name === TypeName.OnlyRoleIn) {
				const roleIn = v as RoleIn;
				return `${roleIn.role.name} in ${roleIn.channels.map((c) => c.name).join(", ")}`;
			} else {
				return (v as ThreadChannel | CategoryChannel | TextChannel | ForumChannel).name;
			}
		}).join(", "));
}

/**
 * setConfig value in Emaps "followOnly"
 */

export function setFollow<T extends keyof IgnoreFollow>(
	name: T,
	guildID: string,
	value: IgnoreFollow[T]
) {
	const guildConfig = followOnlyMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
	if (name === TypeName.OnlyRoleIn) return;
	guildConfig[name] = value;
	followOnlyMaps.set(guildID, guildConfig);
	logInDev(`Set ${name}`,
		value.map((v) => {
			if (name === TypeName.OnlyRoleIn) {
				const roleIn = v as RoleIn;
				return `${roleIn.role.name} in ${roleIn.channels.map((c) => c.name).join(", ")}`;
			} else {
				return (v as ThreadChannel | CategoryChannel | TextChannel | ForumChannel).name;
			}
		}).join(", "));
}

export function setRole(
	on: "follow" | "ignore",
	guildID: string,
	value: Role[]) {
	if (on === "follow") {
		const guildConfig = followOnlyMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.role] = value;
		followOnlyMaps.set(guildID, guildConfig);
	} else {
		const guildConfig = ignoreMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.role] = value;
		ignoreMaps.set(guildID, guildConfig);
	}
	logInDev(`Set ${on}Role`,
		value.map((v) => v.name).join(", "));
}

export function setRoleIn(
	on: "follow" | "ignore",
	guildID: string,
	value: RoleIn[]) {
	if (on === "follow") {
		const guildConfig = followOnlyMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.OnlyRoleIn] = value;
		followOnlyMaps.set(guildID, guildConfig);
	} else {
		const guildConfig = ignoreMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
		guildConfig[TypeName.OnlyRoleIn] = value;
		ignoreMaps.set(guildID, guildConfig);
	}
	logInDev(`Set ${on}OnlyRoleIn`,
		value.map((v) => v.role.name + " " + v.channels.map((v) => v.name).join(", ")).join(", "));
}


/**
 * Get a value in the Emaps "configuration"
 * Return "en" if CommandName.language is not setConfig
 * return true if value is not setConfig (for the other options)
 * @param {CommandName} name
 * @param guildID
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConfig(name: CommandName, guildID: string): string |boolean {
	const guildConfig = optionMaps.get(guildID) as Configuration ?? DEFAULT_CONFIGURATION;
	if (name === CommandName.language) {
		return guildConfig[name as keyof Configuration] || "en";
	} else if (name === CommandName.followOnlyRole || name === CommandName.followOnlyChannel || name === CommandName.followOnlyRoleIn) {
		return guildConfig[name as keyof Configuration]  ?? false;
	}
	return guildConfig[name as keyof Configuration] ?? true;
}



export function getRoleIn(ignore: "follow" | "ignore", guildID: string):
	RoleIn[] {
	const ignoreConfig = ignoreMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
	const followConfig = followOnlyMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;

	if (!ignoreConfig[TypeName.OnlyRoleIn] || !followConfig[TypeName.OnlyRoleIn]) {
		setRoleIn(ignore, guildID, []);
	}
	switch(ignore) {
	case "follow":
		return followConfig[TypeName.OnlyRoleIn] as RoleIn[] ?? [];
	case "ignore":
		return ignoreConfig[TypeName.OnlyRoleIn] as RoleIn[] ?? [];
	}
}

export function getRole(ignore: "follow" | "ignore", guildID: string):
	Role[] {
	const ignoreConfig = ignoreMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
	const followConfig = followOnlyMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;

	if (!ignoreConfig[TypeName.role] || !followConfig[TypeName.role]) {
		setRole(ignore, guildID, []);
	}
	switch(ignore) {
	case "follow":
		return followConfig[TypeName.role] as Role[] ?? [];
	case "ignore":
		return ignoreConfig[TypeName.role] as Role[] ?? [];
	}
}

export function getMaps(maps: "follow" | "ignore", typeName: TypeName, guildID: string):
	| ThreadChannel[]
	| CategoryChannel[]
	| TextChannel[]
	| ForumChannel[] {
	switch(maps) {
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
function getFollow(follow: TypeName, guildID: string):
	| ThreadChannel[]
	| CategoryChannel[]
	| TextChannel[]
	| ForumChannel[] {
	const followConfig = followOnlyMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
	if (!followConfig[follow]) {
		setFollow(follow, guildID, []);
	}
	switch(follow) {
	case TypeName.thread:
		return followConfig[TypeName.thread] as ThreadChannel[] ?? [];
	case TypeName.category:
		return followConfig[TypeName.category] as CategoryChannel[] ?? [];
	case TypeName.channel:
		return followConfig[TypeName.channel] as TextChannel[] ?? [];
	case TypeName.forum:
		return followConfig[TypeName.forum] as ForumChannel[] ?? [];
	default:
		return [];
	}
}

/**
 * Get a value for the Emaps "Ignore"
 * @param ignore {TypeName}
 * @param guildID
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getIgnored(ignore: TypeName, guildID: string):
	| ThreadChannel[]
	| CategoryChannel[]
	| TextChannel[]
	| ForumChannel[]{
	const ignoreConfig = ignoreMaps.get(guildID) as IgnoreFollow ?? DEFAULT_IGNORE_FOLLOW;
	if (!ignoreConfig[ignore]) {
		setIgnore(ignore, guildID, []);
	}
	switch(ignore) {
	case TypeName.thread:
		return ignoreConfig[TypeName.thread] as ThreadChannel[] ?? [];
	case TypeName.category:
		return ignoreConfig[TypeName.category] as CategoryChannel[] ?? [];
	case TypeName.channel:
		return ignoreConfig[TypeName.channel] as TextChannel[] ?? [];
	case TypeName.forum:
		return ignoreConfig[TypeName.forum] as ForumChannel[] ?? [];
	default:
		return [];
	}
}

export function destroyDB(): void {
	followOnlyMaps.deleteAll();
	ignoreMaps.deleteAll();
	optionMaps.deleteAll();
	logInDev("Destroyed DB");
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
	logInDev("Deleted Guild", id);
}

export function loadDBFirstTime(guild: string) {
	followOnlyMaps.set(guild, DEFAULT_IGNORE_FOLLOW);
	ignoreMaps.set(guild, DEFAULT_IGNORE_FOLLOW);
	optionMaps.set(guild, DEFAULT_CONFIGURATION);
	logInDev("Loaded DB for the first time", guild);
}
