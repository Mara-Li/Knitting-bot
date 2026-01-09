import * as Djs from "discord.js";
import db from "../database.js";

/**
 * Verify that the channel type is :
 * - GuildCategory
 * - GuildText
 * - PublicThread
 * - PrivateThread
 * @param channel {Djs.GuildBasedChannel} The channel to check
 * @returns {boolean} true if the channel is valid
 */
export function validateChannelType(channel: Djs.GuildBasedChannel): boolean {
	const validChannelTypes: Djs.ChannelType[] = [
		Djs.ChannelType.GuildCategory,
		Djs.ChannelType.GuildText,
		Djs.ChannelType.PublicThread,
		Djs.ChannelType.PrivateThread,
		Djs.ChannelType.GuildForum,
	];
	return validChannelTypes.includes(channel.type);
}

/**
 * Check if a user is in the thread
 * Return true if the user is in the thread
 * @param {Djs.ThreadChannel} thread - The thread to check
 * @param {Djs.GuildMember} memberToCheck - The member to check
 */
export function isUserInThread(
	thread: Djs.ThreadChannel,
	memberToCheck: Djs.GuildMember
): boolean {
	// Fast path: if the thread member is cached, we know they're in the thread
	return thread.members.cache.has(memberToCheck.id);
}

/**
 * Verify that the role is allowed by the settings for the thread.
 * - if on: "ignore" => verify that the role is ignored
 * - if on: "follow" => verify that the role is followed
 * @param role {@link Djs.GuildMemberRoleManager} The role to check
 * @param on {"ignore" | "follow"} The settings map to check
 */
export function checkMemberRole(
	role: Djs.GuildMemberRoleManager,
	on: "ignore" | "follow"
) {
	const guild = role.guild.id;
	if (on === "follow" && !db.settings.get(guild, "configuration.followOnlyRole"))
		return true;
	const roleIds = db.settings.get(guild, `${on}.role`) ?? []; //getRole(on, guild);
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
export function checkRole(role: Djs.Role, on: "ignore" | "follow") {
	const guild = role.guild.id;
	if (on === "follow" && !db.settings.get(guild, "configuration.followOnlyRole"))
		return true;
	const roleIds = db.settings.get(guild, `${on}.role`) ?? []; //getRole(on, guild);
	return roleIds.includes(role.id);
}

/**
 * Verify that the role is allowed by the settings for a specific thread.
 * - if on: "ignore" => verify that the role is ignored for the specific thread
 * - if on: "follow" => verify that the role is followed for the specific thread
 * @param on {"ignore" | "follow"} The settings map to check
 * @param roleManager {@link Djs.GuildMemberRoleManager} The role to check
 * @param thread {@link Djs.ThreadChannel} The thread to check
 */
export function checkMemberRoleIn(
	on: "follow" | "ignore",
	roleManager: Djs.GuildMemberRoleManager,
	thread: Djs.ThreadChannel
) {
	const guild = thread.guild.id;
	if (on === "follow" && !db.settings.get(guild, "configuration.followOnlyRoleIn"))
		return true;
	const roles = roleManager.cache;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleIn = db.settings.get(guild, `${on}.OnlyRoleIn`) ?? []; //getRoleIn(on, guild);
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
 * @param thread {@link Djs.ThreadChannel} The thread to check
 */
export function checkRoleIn(
	on: "follow" | "ignore",
	role: Djs.Role,
	thread: Djs.ThreadChannel
) {
	const guild = thread.guild.id;
	if (on === "follow" && !db.settings.get(guild, "configuration.followOnlyRoleIn"))
		return true;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleIns = db.settings.get(guild, `${on}.OnlyRoleIn`) ?? []; //getRoleIn(on, guild);
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
 * @param channel {@link Djs.ThreadChannel} The thread to check
 * @param on {"ignore" | "follow"} The settings map to check
 */

export function checkThread(channel: Djs.ThreadChannel, on: "ignore" | "follow") {
	const guild = channel.guild.id;
	const parentChannels = channel.parent;
	const categoryOfParent = parentChannels?.parent;
	const threadIds = db.getMaps(on, "thread", guild);
	const channelIds = db.getMaps(on, "channel", guild);
	const categoryIds = db.getMaps(on, "category", guild);
	const forumIds = db.getMaps(on, "forum", guild);
	return (
		channelIds.includes(channel.id) ||
		forumIds.includes(channel.id) ||
		(categoryOfParent && categoryIds.includes(categoryOfParent.id)) ||
		threadIds.includes(channel.id)
	);
}

/**
 * Get all members that have the permission to view the thread
 */
export function getMemberPermission(
	members: Djs.Collection<string, Djs.GuildMember>,
	thread: Djs.ThreadChannel | Djs.TextChannel,
	allow = true
) {
	if (allow) {
		return members.filter((member) => {
			const channelToCheck = thread.isThread() ? thread.parent : thread;
			if (!channelToCheck) return false;
			const memberPermissions = channelToCheck.permissionsFor(member);
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
