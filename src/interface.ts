import { Locale } from "discord.js";
import type { TFunction } from "i18next";

export enum DefaultMenuBuilder {
	member = "on-member-update",
	thread = "on-thread-created",
	channel = "on-channel-update",
	newMember = "on-new-member",
	disable = "manual-mode",
	show = "show",
	followOnlyRole = "follow-only-role",
	followOnlyChannel = "follow-only-channel",
	followOnlyRoleIn = "follow-only-in",
}

export enum CommandName {
	manualMode = "manualMode",
	member = "onMemberUpdate",
	thread = "onThreadCreated",
	channel = "onChannelUpdate",
	newMember = "onNewMember",
	followOnlyRole = "followOnlyRole",
	followOnlyChannel = "followOnlyChannel",
	followOnlyRoleIn = "followOnlyRoleIn",
	log = "log",
}

export enum TypeName {
	thread = "thread",
	role = "role",
	category = "category",
	channel = "channel",
	forum = "forum",
	OnlyRoleIn = "OnlyRoleIn",
}

export interface RoleIn {
	roleId: string;
	channelIds: string[];
}

export interface Configuration {
	[CommandName.channel]: boolean;
	[CommandName.member]: boolean;
	[CommandName.newMember]: boolean;
	[CommandName.thread]: boolean;
	[CommandName.followOnlyChannel]: boolean;
	[CommandName.followOnlyRole]: boolean;
	[CommandName.followOnlyRoleIn]: boolean;
	language: Locale;
	pin: boolean;
	messageToSend: string;
	[key: string]: boolean | string;
}

export interface IgnoreFollow {
	[TypeName.thread]: string[];
	[TypeName.role]: string[];
	[TypeName.category]: string[];
	[TypeName.channel]: string[];
	[TypeName.forum]: string[];
	[TypeName.OnlyRoleIn]: RoleIn[];
}

export const DEFAULT_CONFIGURATION: Configuration = {
	[CommandName.channel]: false,
	[CommandName.member]: false,
	[CommandName.newMember]: false,
	[CommandName.thread]: false,
	[CommandName.followOnlyChannel]: false,
	[CommandName.followOnlyRole]: false,
	[CommandName.followOnlyRoleIn]: false,
	language: Locale.EnglishUS,
	messageToSend: "_ _",
	pin: false,
};

export const DEFAULT_IGNORE_FOLLOW: IgnoreFollow = {
	[TypeName.thread]: [],
	[TypeName.role]: [],
	[TypeName.category]: [],
	[TypeName.channel]: [],
	[TypeName.forum]: [],
	[TypeName.OnlyRoleIn]: [],
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
