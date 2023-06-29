import { CategoryChannel, ForumChannel, Role, TextChannel, ThreadChannel } from "discord.js";
import Enmap from "enmap";
import { CommandName, RoleIn, TypeName } from "./interface";
import { logInDev } from "./utils";

export const optionMaps = new Enmap({ name: "Configuration" });
export const translationLanguage = optionMaps.get("language") || "en";
const ignoreMaps = new Enmap({ name: "Ignore" });
const followOnlyMaps = new Enmap({ name: "FollowOnly" });



/**
 * Set a value in Emaps "configuration"
 * @param {commandName} name
 * @param {string | boolean} value
 */
export function setConfig(
	name: CommandName,
	value: string 
	| boolean
) {
	optionMaps.set(name, value);
	logInDev(`Set ${name} to ${value}`);
}

/**
 * setConfig value in Emaps "ignore"
 */

export function setIgnore(
	name: TypeName,
	value: (ThreadChannel<boolean> | CategoryChannel | TextChannel | ForumChannel)[]
) {
	ignoreMaps.set(name, value);
	logInDev(`Set ${name}`,
		value.map((v) => v.name).join(", "));
}

/**
 * setConfig value in Emaps "followOnly"
 */

export function setFollow(
	name: TypeName,
	value: (ThreadChannel | CategoryChannel | TextChannel | ForumChannel)[]) {
	followOnlyMaps.set(name, value);
	logInDev(`Set ${name}`,
		value.map((v) => v.name).join(", "));
	return;
}

export function setRole(
	on: "follow" | "ignore",
	value: Role[]) {
	if (on === "follow") {
		followOnlyMaps.set(TypeName.role, value);
	} else {
		ignoreMaps.set(TypeName.role, value);
	}
	logInDev(`Set ${on}Role`,
		value.map((v) => v.name).join(", "));
}

export function setRoleIn(
	on: "follow" | "ignore",
	value: RoleIn[]) {
	if (on === "follow") {
		followOnlyMaps.set(TypeName.OnlyRoleIn, value);
	} else {
		ignoreMaps.set(TypeName.OnlyRoleIn, value);
	}
	logInDev(`Set ${on}OnlyRoleIn`,
		value.map((v) => v.role.name + " " + v.channels.map((v) => v.name).join(", ")).join(", "));
}


/**
 * Get a value in the Emaps "configuration"
 * Return "en" if CommandName.language is not setConfig
 * return true if value is not setConfig (for the other options)
 * @param {CommandName} name
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConfig(name: CommandName): any {
	if (name === CommandName.language) {
		return optionMaps.get(name) || "en";
	} else if (name === CommandName.followOnlyRole || name === CommandName.followOnlyChannel || name === CommandName.followOnlyRoleIn) {
		return optionMaps.get(name) ?? false;
	}
	return optionMaps.get(name) ?? true;
}



export function getRoleIn(ignore: "follow" | "ignore"):
	RoleIn[] {
	if (!ignoreMaps.has(TypeName.OnlyRoleIn)) {
		setRoleIn(ignore, []);
	}
	switch(ignore) {
	case "follow":
		return followOnlyMaps.get(TypeName.OnlyRoleIn) as RoleIn[] ?? [];
	case "ignore":
		return ignoreMaps.get(TypeName.OnlyRoleIn) as RoleIn[] ?? [];
	}
}

export function getRole(ignore: "follow" | "ignore"):
	Role[] {
	if (!ignoreMaps.has(TypeName.role)) {
		setRole(ignore, []);
	}
	switch(ignore) {
	case "follow":
		return followOnlyMaps.get(TypeName.role) as Role[] ?? [];
	case "ignore":
		return ignoreMaps.get(TypeName.role) as Role[] ?? [];
	}
}

export function getMaps(maps: "follow" | "ignore", typeName: TypeName):
	| ThreadChannel[]
	| CategoryChannel[]
	| TextChannel[]
	| ForumChannel[] {
	switch(maps) {
	case "follow":
		return getFollow(typeName);
	case "ignore":
		return getIgnored(typeName);
	}
}

/**
 * Get a value for the Emaps "FollowOnly"
 * @param follow {TypeName}
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getFollow(follow: TypeName):
	| ThreadChannel[]
	| CategoryChannel[]
	| TextChannel[]
	| ForumChannel[] {
	if (!followOnlyMaps.has(follow)) {
		setFollow(follow, []);
	}
	switch(follow) {
	case TypeName.thread:
		return followOnlyMaps.get(TypeName.thread) as ThreadChannel[] ?? [];
	case TypeName.category:
		return followOnlyMaps.get(TypeName.category) as CategoryChannel[] ?? [];
	case TypeName.channel:
		return followOnlyMaps.get(TypeName.channel) as TextChannel[] ?? [];
	case TypeName.forum:
		return followOnlyMaps.get(TypeName.forum) as ForumChannel[] ?? [];
	default:
		return [];
	}
}

/**
 * Get a value for the Emaps "Ignore"
 * @param ignore {TypeName}
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
function getIgnored(ignore: TypeName):
	| ThreadChannel[]
	| CategoryChannel[]
	| TextChannel[]
	| ForumChannel[]{
	if (!ignoreMaps.has(ignore)) {
		setIgnore(ignore, []);
	}
	switch(ignore) {
	case TypeName.thread:
		return ignoreMaps.get(TypeName.thread) as ThreadChannel[] ?? [];
	case TypeName.category:
		return ignoreMaps.get(TypeName.category) as CategoryChannel[] ?? [];
	case TypeName.channel:
		return ignoreMaps.get(TypeName.channel) as TextChannel[] ?? [];
	case TypeName.forum:
		return ignoreMaps.get(TypeName.forum) as ForumChannel[] ?? [];
	default:
		return [];
	}
}
