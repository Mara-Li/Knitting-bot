import {
	type CategoryChannel,
	ChannelType,
	type Collection,
	type ForumChannel,
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
	const threadMemberArray: ThreadMember<boolean>[] = [];
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
	const roles = getRole(on, guild);
	const allMemberRoles = role.cache;
	return allMemberRoles.some((memberRole) => roles.some((r) => r.id === memberRole.id));
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
	const allFollowedRoles = getRole(on, guild);
	return allFollowedRoles.some((followedRole) => followedRole.id === role.id);
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
		const find = roleIn.find((r) => r.role.id === role.id);
		if (!find) return false;
		return find.channels.some((channel) => {
			if (channel.id === thread.id) return true;
			if (channel.id === parentChannel?.id) return true;
			return channel.id === categoryOfParent?.id;
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
	const find = roleIns.find((followedRole) => followedRole.role.id === role.id);
	if (!find) return false;
	return find.channels.some((channel) => {
		if (channel.id === thread.id) return true;
		if (channel.id === parentChannel?.id) return true;
		return channel.id === categoryOfParent?.id;
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
	const followedThread = (getMaps(on, TypeName.thread, guild) as ThreadChannel[]) || [];
	const followedChannels = (getMaps(on, TypeName.channel, guild) as TextChannel[]) || [];
	const followedCategories =
		(getMaps(on, TypeName.category, guild) as CategoryChannel[]) || [];
	const followedForum = (getMaps(on, TypeName.forum, guild) as ForumChannel[]) || [];
	return (
		followedChannels.some((followedChannel) => followedChannel.id === channel.id) ||
		followedForum.some((followedForum) => followedForum.id === channel.id) ||
		followedCategories.some(
			(followedCategory) => followedCategory.id === categoryOfParent?.id
		) ||
		followedThread.some((followedThread) => followedThread.id === channel.id)
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
