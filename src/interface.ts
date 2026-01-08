import type * as Djs from "discord.js";
import { Locale } from "discord.js";
import type { TFunction } from "i18next";

export interface RoleIn {
	roleId: string;
	channelIds: string[];
}

export interface Configuration {
	onChannelUpdate: boolean;
	onMemberUpdate: boolean;
	onNewMember: boolean;
	onThreadCreated: boolean;
	followOnlyChannel: boolean;
	followOnlyRole: boolean;
	followOnlyRoleIn: boolean;
	manualMode: boolean;
	language: Locale;
	pin: boolean;
	messageToSend: string;
	log: boolean | string;
}

export type ConfigurationKey = keyof Configuration;

export interface IgnoreFollow {
	thread: string[];
	role: string[];
	category: string[];
	channel: string[];
	forum: string[];
	OnlyRoleIn: RoleIn[];
}

export type IgnoreFollowKey = keyof IgnoreFollow;

export const DEFAULT_CONFIGURATION: Configuration = {
	followOnlyChannel: false,
	followOnlyRole: false,
	followOnlyRoleIn: false,
	language: Locale.EnglishUS,
	log: false,
	manualMode: true,
	messageToSend: "_ _",
	onChannelUpdate: false,
	onMemberUpdate: false,
	onNewMember: false,
	onThreadCreated: false,
	pin: false,
};

export const ConfigurationKeys = Object.keys(DEFAULT_CONFIGURATION);

export const DEFAULT_IGNORE_FOLLOW: IgnoreFollow = {
	category: [],
	channel: [],
	forum: [],
	OnlyRoleIn: [],
	role: [],
	thread: [],
};

/**
 * Interface for unified ServerData Enmap
 * Stores all server configuration data in a single Enmap
 */
export interface ServerData {
	configuration: Configuration;
	ignore: IgnoreFollow;
	follow: IgnoreFollow;
	messageCache: Record<string, string>;
}

export type Translation = TFunction<"translation", undefined>;
export const TIMEOUT = 600000; // 10 minutes
export type TChannel = "channel" | "thread" | "category" | "forum";
export type ArrayChannel = Array<
	Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
>;
