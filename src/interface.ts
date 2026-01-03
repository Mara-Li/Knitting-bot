import {
	type CategoryChannel,
	type ForumChannel,
	Locale,
	type Role,
	type TextChannel,
	type ThreadChannel,
} from "discord.js";
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
	role: Role;
	channels: (ThreadChannel | CategoryChannel | TextChannel | ForumChannel)[];
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
	[key: string]: boolean | string;
}

export interface IgnoreFollow {
	[TypeName.thread]: ThreadChannel[];
	[TypeName.role]: Role[];
	[TypeName.category]: CategoryChannel[];
	[TypeName.channel]: TextChannel[];
	[TypeName.forum]: ForumChannel[];
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
 * Interface pour l'EnMap "Configuration" (optionMaps)
 * Stocke les configurations des guildes avec leurs valeurs
 */
export interface ConfigurationEnMap {
	[guildId: string]: Configuration;
}

/**
 * Interface pour l'EnMap "Ignore" (ignoreMaps)
 * Stocke les éléments ignorés par guilde
 */
export interface IgnoreEnMap {
	[guildId: string]: IgnoreFollow;
}

/**
 * Interface pour l'EnMap "FollowOnly" (followOnlyMaps)
 * Stocke les éléments suivis uniquement par guilde
 */
export interface FollowOnlyEnMap {
	[guildId: string]: IgnoreFollow;
}

export type Translation = TFunction<"translation", undefined>;
