import { CategoryChannel, ForumChannel, Role, TextChannel, ThreadChannel } from "discord.js";

export enum DefaultMenuBuilder {
	language = "language",
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
	language = "language",
	manualMode = "manualMode",
	member = "onMemberUpdate",
	thread = "onThreadCreated",
	channel = "onChannelUpdate",
	newMember = "onNewMember",
	followOnlyRole = "followOnlyRole",
	followOnlyChannel = "followOnlyChannel",
	followOnlyRoleIn = "followOnlyRoleIn",
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
	channels:
		(ThreadChannel
		| CategoryChannel
		| TextChannel
		| ForumChannel)[]
}
