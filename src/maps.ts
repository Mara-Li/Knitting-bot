import Enmap from "enmap";
import { logInDev } from "./utils";
import { CategoryChannel, ForumChannel, Role, TextChannel, ThreadChannel } from "discord.js";

export const optionMaps = new Enmap({ name: "Configuration" });
export const translationLanguage = optionMaps.get("language") || "en";
const ignoreMaps = new Enmap({ name: "Ignore" });
const followOnlyMaps = new Enmap({ name: "FollowOnly" });

export enum CommandName {
	language = "language",
	member = "onMemberUpdate",
	thread = "onThreadCreated",
	channel = "onChannelUpdate",
	newMember = "onNewMember",
	followOnlyRole = "followOnlyRole",
	followOnlyChannel = "followOnlyChannel",
}

export enum TypeName {
	thread = "thread",
	role = "role",
	category = "category",
	channel = "channel",
	forum = "forum",
}

/**
 * Set a value in Emaps "configuration"
 * @param {commandName} name
 * @param {string | boolean} value
 */
export function set(
	name: CommandName,
	value: string 
	| boolean
) {
	optionMaps.set(name, value);
	logInDev(`Set ${name} to ${value}`);
}

/**
 * set value in Emaps "ignore"
 */

export function setIgnore(
	name: TypeName,
	value: (ThreadChannel<boolean> | CategoryChannel | Role | TextChannel | ForumChannel)[],
) {
	ignoreMaps.set(name, value);
	logInDev(`Set ${name}`,
		value.map((v) => v.name).join(", "));
}

/**
 * set value in Emaps "followOnly"
 */

export function setFollow(
	name: TypeName,
	value: (ThreadChannel<boolean> | CategoryChannel | Role | TextChannel | ForumChannel)[]) {
	followOnlyMaps.set(name, value);
	logInDev(`Set ${name}`,
		value.map((v) => v.name).join(", "));
}



/**
 * Get a value in the Emaps "configuration"
 * Return "en" if CommandName.language is not set
 * return true if value is not set (for the other options)
 * @param {CommandName} name
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get(name: CommandName): any {
	if (name === CommandName.language) {
		return optionMaps.get(name) || "en";
	} else if (name === CommandName.followOnlyRole || name === CommandName.followOnlyChannel) {
		return optionMaps.get(name) ?? false;
	}
	return optionMaps.get(name) ?? true;
}

/**
 * Get a value for the Emaps "Ignore"
 * @param ignore {TypeName}
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
export function getIgnored(ignore: TypeName):
	ThreadChannel[]
	| CategoryChannel[]
	| Role[]
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
	case TypeName.role:
		return ignoreMaps.get(TypeName.role) as Role[] ?? [];
	case TypeName.channel:
		return ignoreMaps.get(TypeName.channel) as TextChannel[] ?? [];
	case TypeName.forum:
		return ignoreMaps.get(TypeName.forum) as ForumChannel[] ?? [];
	}
}

/**
 * Get a value for the Emaps "FollowOnly"
 * @param follow {TypeName}
 * @returns {ThreadChannel[] | CategoryChannel[] | Role[] | TextChannel[]}
 */
export function getFollow(follow: TypeName):
	ThreadChannel[]
	| CategoryChannel[]
	| Role[]
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
	case TypeName.role:
		return followOnlyMaps.get(TypeName.role) as Role[] ?? [];
	case TypeName.channel:
		return followOnlyMaps.get(TypeName.channel) as TextChannel[] ?? [];
	case TypeName.forum:
		return followOnlyMaps.get(TypeName.forum) as ForumChannel[] ?? [];
	}
}
