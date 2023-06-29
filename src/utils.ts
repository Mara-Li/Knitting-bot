import {
	CategoryChannel,
	Collection,
	ForumChannel,
	GuildMember,
	GuildMemberRoleManager,
	MessageFlags, MessagePayloadOption,
	Role,
	TextChannel,
	ThreadChannel,
	ThreadMember,
} from "discord.js";
import * as process from "process";
import { emoji } from "./index";
import { get, getFollow, getIgnored, getRole, getRoleIn } from "./maps";
import { CommandName, TypeName } from "./interface";


/**
 * Get all members that have the permission to view the thread
 * @param {Collection<string, GuildMember>} members All members of the server
 * @param {ThreadChannel | TextChannel} thread The thread to check
 * @param {boolean} allow If true, get all members that have the permission to view the thread, else get all members that don't have the permission to view the thread
 */
export function getMemberPermission(members: Collection<string, GuildMember>, thread: ThreadChannel | TextChannel, allow = true) {
	if (allow) {
		return members.filter(member => {
			if (!thread.parent) return false;
			const memberPermissions = thread.parent.permissionsFor(member);
			return (
				memberPermissions.has("ViewChannel") &&
				memberPermissions.has("ReadMessageHistory")
			);
		});
	} else if (!allow) {
		return members.filter(member => {
			const memberPermissions = thread.permissionsFor(member);
			return (
				!memberPermissions.has("ViewChannel", true) ||
				!memberPermissions.has("ReadMessageHistory", true)
			);
		});
	}
	return members;
}

export async function addUserToThread(thread: ThreadChannel, user: GuildMember) {
	if (thread.permissionsFor(user).has("ViewChannel", true) && await checkIfUserNotInTheThread(thread, user)) {
		if (get(CommandName.followOnlyRoleIn)) {
			await thread.members.add(user);
		} else if (!get(CommandName.followOnlyRole) && !checkMemberRoleNotIgnored(user.roles)) {
			await thread.members.add(user);
			logInDev(`Add @${user.user.username} to #${thread.name}`);
		} else if (get(CommandName.followOnlyRole) && checkIfMemberRoleIsFollowed(user.roles)) {
			await thread.members.add(user);
			logInDev(`Add @${user.user.username} to #${thread.name}`);
		}
	}
}

/**
 * Add a list to user to a thread, with verification the permission. After, send a message to ping the user and remove it.
 * @param {ThreadChannel} thread The thread to add the user and send the message
 * @param {GuildMember} members The member to add to the thread
 */
export async function getUsersToPing(thread: ThreadChannel, members: GuildMember[]) {
	const usersToBeAdded: GuildMember[] = [];
	for (const member of members) {
		if (thread.permissionsFor(member).has("ViewChannel", true) && await checkIfUserNotInTheThread(thread, member)) {
			if (checkMemberRoleInFollowed(member.roles, thread)) {
				logInDev(`followOnlyRoleIn: @${member.user.username} is in a followed role in #${thread.name}`);
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name}`);
			} else if (get(CommandName.followOnlyRole) && checkIfMemberRoleIsFollowed(member.roles) && !get(CommandName.followOnlyRoleIn)) {
				logInDev(`followOnlyRole: @${member.user.username} is in a followed role`);
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name}`);
			} else if (!get(CommandName.followOnlyRole) && !checkMemberRoleNotIgnored(member.roles) && !get(CommandName.followOnlyRoleIn)) {
				logInDev(`followOnlyRole DISABLED && @${member.user.username} is not in an ignored role`);
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name}`);
			}
		}
	}
	return usersToBeAdded;
}

/**
 * Same as above, but for a role
 * @param {ThreadChannel} thread The thread to add the role and send the message
 * @param {Role[]} roles The role to add to the thread
 */
export async function getRoleToPing(thread: ThreadChannel, roles: Role[]) {
	const roleToBeAdded: Role[] = [];
	for (const role of roles) {
		//check if all members of the role are in the thread
		const membersInTheThread = await thread.members.fetch();
		const membersOfTheRoleNotInTheThread = role.members.filter(member => !membersInTheThread.has(member.id));
		if (role.name !== "@everyone" && thread.permissionsFor(role).has("ViewChannel", true) && role.members.size >0 && membersOfTheRoleNotInTheThread.size > 0) {
			if (checkRoleInFollowed(role, thread)) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}`);
			} else if (get(CommandName.followOnlyRole) && checkIfRoleIsFollowed(role)) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}`);
			} else if (!get(CommandName.followOnlyRole) && !checkRoleNotIgnored(role)) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}`);
			}
		}
	}
	return roleToBeAdded;
}



/**
 * Check if a user is not in the thread
 * Return true if the user is not in the thread
 * @param {ThreadChannel} thread The thread to check
 * @param {GuildMember} memberToCheck The member to check
 */
export async function checkIfUserNotInTheThread(thread: ThreadChannel, memberToCheck: GuildMember) {
	const members = await thread.members.fetch();
	const threadMemberArray: ThreadMember<boolean>[] = [];
	members.forEach(member => {
		threadMemberArray.push(member);
	});
	return !threadMemberArray.some(member => member.id === memberToCheck.id);
}

/**
 * Verify if any role of the member is not ignored
 * @param role {GuildMemberRoleManager} The roles of the member to check
 * @returns {boolean} Return true if the member has a role that is ignored
 */
export function checkMemberRoleNotIgnored(role: GuildMemberRoleManager) {
	const allIgnoredRoles = getRole("ignore");
	const allMemberRoles = role.cache;
	return allMemberRoles.some(memberRole => allIgnoredRoles.some(ignoredRole => ignoredRole.id === memberRole.id));
}

export function checkRoleNotIgnored(role: Role) {
	const allIgnoredRoles = getRole("ignore");
	return allIgnoredRoles.some(ignoredRole => ignoredRole.id === role.id);
}

export function checkRoleInIgnored(role: Role, thread: ThreadChannel) {
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleInIgnored = getRoleIn("ignore");
	const ignoredRole = roleInIgnored.find(ignoredRole => ignoredRole.role.id === role.id);
	if (!ignoredRole) return false;
	return ignoredRole.channels.some(channel => {
		if (channel === thread) return true;
		else if (channel === parentChannel) return true;
		else if (channel === categoryOfParent) return true;
		return false;
	});
	
}

export function checkMemberRoleInFollowed(role: GuildMemberRoleManager, thread: ThreadChannel) {
	if (!get(CommandName.followOnlyRoleIn)) return true;
	const roles = role.cache;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleInFollowed = getRoleIn("follow");
	
	return roles.some(role => {
		const followedRole = roleInFollowed.find(followedRole => followedRole.role.id === role.id);
		if (!followedRole) return false; //if the role is not in the follow list, it's not followed
		return followedRole.channels.some(channel => {
			if (channel === thread) return true;
			else if (channel === parentChannel) return true;
			else if (channel === categoryOfParent) return true;
			return false;
		});
	});
}

export function checkRoleInFollowed(role: Role, thread: ThreadChannel) {
	if (!get(CommandName.followOnlyRoleIn)) return true;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleInFollowed = getRoleIn("follow");
	const followedRole = roleInFollowed.find(followedRole => followedRole.role.id === role.id);
	if (!followedRole) return false;
	return followedRole.channels.some(channel => {
		if (channel === thread) return true;
		else if (channel === parentChannel) return true;
		else if (channel === categoryOfParent) return true;
		return false;
	});
	
}

export function checkIfMemberRoleIsFollowed(role: GuildMemberRoleManager) {
	if (get(CommandName.followOnlyRole) === "false") return true;
	const allFollowedRoles = getRole("follow");
	const allMemberRoles = role.cache;
	return allMemberRoles.some(memberRole => allFollowedRoles.some(followedRole => followedRole.id === memberRole.id));
}

export function checkIfRoleIsFollowed(role: Role) {
	if (get(CommandName.followOnlyRole) === "false") return true;
	const allFollowedRoles = getRole("follow");
	return allFollowedRoles.some(followedRole => followedRole.id === role.id);
}

/**
 * Check if a thread is not ignored
 * @param channel {ThreadChannel} The thread to check
 * @returns {boolean} Return true if the thread is ignored
 */
export function checkIfThreadIsIgnored(channel: ThreadChannel) {
	logInDev(`Check if #${channel.name} is ignored`);
	const parentChannel = channel.parent;
	const categoryOfParent = parentChannel?.parent;
	const allIgnoredChannels = getIgnored(TypeName.channel) as TextChannel[] || [];
	const allIgnoredCategories = getIgnored(TypeName.category) as CategoryChannel[] || [];
	const allIgnoredThreads = getIgnored(TypeName.thread) as ThreadChannel[] || [];
	const allIgnoredForum = getIgnored(TypeName.forum) as ForumChannel[] || [];
	return allIgnoredChannels.some(ignoredChannel => ignoredChannel.id === channel.id) ||
		allIgnoredForum.some(ignoredForum => ignoredForum.id === channel.id) ||
		allIgnoredCategories.some(ignoredCategory => ignoredCategory.id === categoryOfParent?.id) ||
		allIgnoredThreads.some(ignoredThread => ignoredThread.id === channel.id);
	
}

export function checkIfTheadIsFollowed(channel: ThreadChannel) {
	logInDev(`Check if #${channel.name} is followed`);
	const parentChannels = channel.parent;
	const categoryOfParent = parentChannels?.parent;
	const followedThread = getFollow(TypeName.thread) as ThreadChannel[] || [];
	const followedChannels = getFollow(TypeName.channel) as TextChannel[] || [];
	const followedCategories = getFollow(TypeName.category) as CategoryChannel[] || [];
	const followedForum = getFollow(TypeName.forum) as ForumChannel[] || [];
	return followedChannels.some(followedChannel => followedChannel.id === channel.id) ||
		followedForum.some(followedForum => followedForum.id === channel.id) ||
		followedCategories.some(followedCategory => followedCategory.id === categoryOfParent?.id) ||
		followedThread.some(followedThread => followedThread.id === channel.id);
}

/**
 * Add all members that have the permission to view the thread, first check by their role and after add the member that have overwrite permission
 * if there is no role in the server, check all members directly
 * @param {ThreadChannel} thread The thread to add the members
 */
export async function addRoleAndUserToThread(thread: ThreadChannel) {
	const members = await thread.guild.members.fetch();
	const toPing: GuildMember[] = [];
	const rolesWithAccess: Role[] = thread
		.guild.roles.cache
		.filter((role) => {
			const permissions = role.permissions.toArray();
			return permissions.includes("ViewChannel");
		})
		.toJSON();
	

	if (rolesWithAccess.length > 0) {
		getRoleToPing(thread, rolesWithAccess).then(roles => {
			roles.forEach(role => {
				toPing.push(...role.members.toJSON());
			});
		});
	} else {
		const guildMembers: GuildMember[] = members.toJSON();
		await getUsersToPing(thread, guildMembers).then(users => {
			toPing.push(...users);
		});
	}
	//get all member that have access to the thread (overwriting permission)
	const reloadMembers = await thread.guild.members.fetch();
	const memberWithAccess = getMemberPermission(reloadMembers, thread);
	if (memberWithAccess) {
		const memberWithAccessArray: GuildMember[] = memberWithAccess.toJSON();
		await getUsersToPing(thread, memberWithAccessArray).then(users => {
			toPing.push(...users);
		});
	}
	if (toPing.length > 0) {
		const messagePayload: MessagePayloadOption = {
			content: emoji,
			flags: MessageFlags.SuppressNotifications
		};
		const message = await thread.send(messagePayload);
		await message.edit(toPing.map(member => `<@${member.id}>`).join(" "));
		await message.delete();
	}
}

export function logInDev(...text: unknown[]) {
	const time= new Date();
	const timeString = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
	if (process.env.NODE_ENV === "development") {
		if (text.length === 1) {
			console.log(`${timeString} - ${text}`);
		} else {
			console.log(timeString, text);
		}
	}
}

