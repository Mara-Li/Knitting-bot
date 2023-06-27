import Enmap from "enmap";
import { logInDev } from "./utils";
import { CategoryChannel, Role, TextChannel, ThreadChannel } from "discord.js";

export const optionMaps = new Enmap({ name: "Configuration" });
export const translationLanguage = optionMaps.get("language") || "en";

export enum CommandName {
	language = "language",
	member = "onMemberUpdate",
	thread = "onThreadCreated",
	channel = "onChannelUpdate",
	newMember = "onNewMember",
	ignoreThread = "ignoreThread",
	ignoreRole = "ignoreRole",
	ignoreCategory = "ignoreCategory",
	ignoreChannel = "ignoreChannel",
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
	| ThreadChannel[] 
	| Role[] 
	| TextChannel[] 
	| CategoryChannel[] 
) {
	optionMaps.set(name, value);
	logInDev(`Set ${name} to `, !(value instanceof Array) ? value : value.map((v:Role|ThreadChannel|TextChannel|CategoryChannel) => v.name));
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
	}
	return optionMaps.get(name) ?? true;
}

export function getIgnoredThreads(): ThreadChannel[] {
	if (!optionMaps.has(CommandName.ignoreThread)) {
		set(CommandName.ignoreThread, []);
	}
	return optionMaps.get(CommandName.ignoreThread) as ThreadChannel[] ?? [];
}

export function getIgnoredCategories(): CategoryChannel[] {
	if (!optionMaps.has(CommandName.ignoreCategory)) {
		set(CommandName.ignoreCategory, []);
	}
	return optionMaps.get(CommandName.ignoreCategory) as CategoryChannel[] ?? [];
}

export function getIgnoredRoles(): Role[] {
	if (!optionMaps.has(CommandName.ignoreRole)) {
		set(CommandName.ignoreRole, []);
	}
	return optionMaps.get(CommandName.ignoreRole) as Role[] ?? [];
}

export function getIgnoredTextChannels(): TextChannel[] {
	if (!optionMaps.has(CommandName.ignoreChannel)) {
		set(CommandName.ignoreChannel, []);
	}
	return optionMaps.get(CommandName.ignoreChannel) as TextChannel[] ?? [];
}
