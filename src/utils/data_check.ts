import {
	ChannelType,
	type Collection,
	type GuildBasedChannel,
	type GuildMember,
	type GuildMemberRoleManager,
	type Role,
	type TextChannel,
	type ThreadChannel,
	type ThreadMember,
} from "discord.js";
import { CommandName, TypeName } from "../interface";
import { getConfig, getMaps, getRole, getRoleIn } from "../maps";

/**
 * Verify that the channel type is :
 * - GuildCategory
 * - GuildText
 * - PublicThread
 * - PrivateThread
 * @param channel {GuildBasedChannel} The channel to check
 * @returns {boolean} true if the channel is valid
 */
export function validateChannelType(channel: GuildBasedChannel): boolean {
	const validChannelTypes: ChannelType[] = [
		ChannelType.GuildCategory,
		ChannelType.GuildText,
		ChannelType.PublicThread,
		ChannelType.PrivateThread,
		ChannelType.GuildForum,
	];
	return validChannelTypes.includes(channel.type);
}

/**
 * Check if a user is not in the thread
 * Return true if the user is not in the thread
 * @param {ThreadChannel} thread - The thread to check
 * @param {GuildMember} memberToCheck - The member to check
 */
export async function checkIfUserNotInTheThread(
	thread: ThreadChannel,
	memberToCheck: GuildMember
) {
	const members = thread.members.cache;
	const threadMemberArray: ThreadMember[] = [];
	members.forEach((member) => {
		threadMemberArray.push(member);
	});
	return !threadMemberArray.some((member) => member.id === memberToCheck.id);
}

/**
 * Verify that the role is allowed by the settings for the thread.
 * - if on: "ignore" => verify that the role is ignored
 * - if on: "follow" => verify that the role is followed
 * @param role {@link GuildMemberRoleManager} The role to check
 * @param on {"ignore" | "follow"} The settings map to check
 */
export function checkMemberRole(role: GuildMemberRoleManager, on: "ignore" | "follow") {
	const guild = role.guild.id;
	if (on === "follow" && !getConfig(CommandName.followOnlyRole, guild)) return true;
	const roleIds = getRole(on, guild);
	const allMemberRoles = role.cache;
	return allMemberRoles.some((memberRole) => roleIds.includes(memberRole.id));
}

/**
 * Verify that the role is allowed by the settings for the thread.
 * - if on: "ignore" => verify that the role is ignored
 * - if on: "follow" => verify that the role is followed
 * @param role {@link Role} The role to check
 * @param on {"ignore" | "follow"} The settings map to check
 */
export function checkRole(role: Role, on: "ignore" | "follow") {
	const guild = role.guild.id;
	if (on === "follow" && !getConfig(CommandName.followOnlyRole, guild)) return true;
	const roleIds = getRole(on, guild);
	return roleIds.includes(role.id);
}

/**
 * Verify that the role is allowed by the settings for a specific thread.
 * - if on: "ignore" => verify that the role is ignored for the specific thread
 * - if on: "follow" => verify that the role is followed for the specific thread
 * @param on {"ignore" | "follow"} The settings map to check
 * @param roleManager {@link GuildMemberRoleManager} The role to check
 * @param thread {@link ThreadChannel} The thread to check
 */
export function checkMemberRoleIn(
	on: "follow" | "ignore",
	roleManager: GuildMemberRoleManager,
	thread: ThreadChannel
) {
	const guild = thread.guild.id;
	if (on === "follow" && !getConfig(CommandName.followOnlyRoleIn, guild)) return true;
	const roles = roleManager.cache;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleIn = getRoleIn(on, guild);
	return roles.some((role) => {
		const find = roleIn.find((r) => r.roleId === role.id);
		if (!find) return false;
		return find.channelIds.some((channelId) => {
			if (channelId === thread.id) return true;
			if (channelId === parentChannel?.id) return true;
			return channelId === categoryOfParent?.id;
		});
	});
}

/**
 * Verify that the role is allowed by the settings for a specific thread.
 * - if on: "ignore" => verify that the role is ignored for the specific thread
 * - if on: "follow" => verify that the role is followed for the specific thread
 * @param on {"ignore" | "follow"} The settings map to check
 * @param role {@link Role} The role to check
 * @param thread {@link ThreadChannel} The thread to check
 */
export function checkRoleIn(on: "follow" | "ignore", role: Role, thread: ThreadChannel) {
	const guild = thread.guild.id;
	if (on === "follow" && !getConfig(CommandName.followOnlyRoleIn, guild)) return true;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleIns = getRoleIn(on, guild);
	const find = roleIns.find((followedRole) => followedRole.roleId === role.id);
	if (!find) return false;
	return find.channelIds.some((channelId) => {
		if (channelId === thread.id) return true;
		if (channelId === parentChannel?.id) return true;
		return channelId === categoryOfParent?.id;
	});
}

/**
 * Check if the thread is followed or ignored by the settings
 * - if on: "ignore" => verify that the thread is ignored
 * - if on: "follow" => verify that the thread is followed
 * @param channel {@link ThreadChannel} The thread to check
 * @param on {"ignore" | "follow"} The settings map to check
 */

export function checkThread(channel: ThreadChannel, on: "ignore" | "follow") {
	const guild = channel.guild.id;
	const parentChannels = channel.parent;
	const categoryOfParent = parentChannels?.parent;
	const threadIds = getMaps(on, TypeName.thread, guild);
	const channelIds = getMaps(on, TypeName.channel, guild);
	const categoryIds = getMaps(on, TypeName.category, guild);
	const forumIds = getMaps(on, TypeName.forum, guild);
	return (
		channelIds.includes(channel.id) ||
		forumIds.includes(channel.id) ||
		(categoryOfParent && categoryIds.includes(categoryOfParent.id)) ||
		threadIds.includes(channel.id)
	);
}

/**
 * Get all members that have the permission to view the thread
 * @param members
 * @param thread
 * @param {boolean} allow If true, getConfig all members that have the permission to view the thread, else getConfig all members that don't have the permission to view the thread
 */
export function getMemberPermission(
	members: Collection<string, GuildMember>,
	thread: ThreadChannel | TextChannel,
	allow = true
) {
	if (allow) {
		return members.filter((member) => {
			if (!thread.parent) return false;
			const memberPermissions = thread.parent.permissionsFor(member);
			return (
				memberPermissions.has("ViewChannel") &&
				memberPermissions.has("ReadMessageHistory")
			);
		});
	}
	if (!allow) {
		return members.filter((member) => {
			const memberPermissions = thread.permissionsFor(member);
			return (
				!memberPermissions.has("ViewChannel", true) ||
				!memberPermissions.has("ReadMessageHistory", true)
			);
		});
	}
	return members;
}
