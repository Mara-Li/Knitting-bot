import Enmap from "enmap";
import { logInDev } from "./utils";
import { ThreadChannel } from "discord.js";

export const optionMaps = new Enmap({ name: "Configuration" });
export const translationLanguage = optionMaps.get("language") || "en";

export enum CommandName {
	language = "language",
	member = "onMemberUpdate",
	thread = "onThreadCreated",
	channel = "onChannelUpdate",
	newMember = "onNewMember",
	ignore = "ignore",
}

/**
 * Set a value in Emaps "configuration"
 * @param {commandName} name
 * @param {string | boolean} value
 */
export function set(
	name: CommandName,
	value: string | boolean | ThreadChannel[]
) {
	optionMaps.set(name, value);
	logInDev(`Set ${name} to `, !(value instanceof Array) ? value : value.map((v:ThreadChannel) => v.name));
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
	if (!optionMaps.has(CommandName.ignore)) {
		set(CommandName.ignore, []);
	}
	return optionMaps.get(CommandName.ignore) as ThreadChannel[] ?? [];
}

export function deleteMaps(key: CommandName) {
	optionMaps.delete(key);
	logInDev(`Delete ${key}`);
}

/**
 * Set default value in Emaps "configuration"
 */
export function setDefaultValue() {
	if (!optionMaps.has("language")) {
		set(CommandName.language, "en");
		logInDev("Set default language to en");
	}
	if (!optionMaps.has("onChannelUpdate")) {
		set(CommandName.channel, true);
		logInDev("Set default onChannelUpdate to true");
	}
	if (!optionMaps.has("onMemberUpdate")) {
		set(CommandName.member, true);
		logInDev("Set default onMemberUpdate to true");
	}
	if (!optionMaps.has("onNewMember")) {
		set(CommandName.newMember, true);
		logInDev("Set default onNewMember to true");
	}
	if (!optionMaps.has("onThreadCreated")) {
		set(CommandName.thread, true);
		logInDev("Set default onThreadCreated to true");
	}
	if (!optionMaps.has("ignore")) {
		set(CommandName.ignore, []);
		logInDev("Set default ignore to []");
	}
}

