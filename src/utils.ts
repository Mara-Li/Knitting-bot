import {
	CategoryChannel,
	Collection,
	GuildBasedChannel,
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
import { getIgnoredCategories, getIgnoredRoles, getIgnoredTextChannels, getIgnoredThreads } from "./maps";



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
		const messagePayload : MessagePayloadOption = {
			content: emoji,
			flags: MessageFlags.SuppressNotifications,
		};
		const message = await thread.send(messagePayload);
		await message.edit(`<@${user.id}>`);
		await message.delete();
		logInDev(`Add @${user.user.username} to #${thread.name}`);
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
			usersToBeAdded.push(member);
			logInDev(`Add @${member.user.username} to #${thread.name}`);
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
			roleToBeAdded.push(role);
			logInDev(`Add @${role.name} to #${thread.name}`);
		}
	}
	return roleToBeAdded;
}

/**
 * Remove a user from a thread, with verification the permission
 * @param {ThreadChannel} thread The thread to remove the user
 * @param {GuildMember} member The member to remove from the thread
 */
export async function removeUserFromThread(thread: ThreadChannel, member: GuildMember) {
	if (!thread.permissionsFor(member).has("ViewChannel", true)) {
		await thread.members.remove(member.id);
		logInDev(`Remove @${member.user.username} from #${thread.name}`);
	}
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
export function checkRoleNotIgnored(role: GuildMemberRoleManager) {
	const allIgnoredRoles = getIgnoredRoles() as Role[] || [];
	const allMemberRoles = role.cache;
	return allMemberRoles.some(memberRole => allIgnoredRoles.some(ignoredRole => ignoredRole.id === memberRole.id));

}

/**
 * Check if a thread is not ignored
 * @param channel {ThreadChannel} The thread to check
 * @returns {boolean} Return true if the thread is ignored
 */
export function checkIfThreadIsIgnored(channel: ThreadChannel) {
	const parentChannel = channel.parent;
	const categoryOfParent = parentChannel?.parent;
	const allIgnoredChannels = getIgnoredTextChannels() as TextChannel[] || [];
	const allIgnoredCategories = getIgnoredCategories() as CategoryChannel[] || [];
	const allIgnoredThreads = getIgnoredThreads() as ThreadChannel[] || [];
	return allIgnoredChannels.some(ignoredChannel => ignoredChannel.id === channel.id) ||
		allIgnoredCategories.some(ignoredCategory => ignoredCategory.id === categoryOfParent?.id) ||
		allIgnoredThreads.some(ignoredThread => ignoredThread.id === channel.id);
	
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
	
	const messagePayload : MessagePayloadOption = {
		content: emoji,
		flags: MessageFlags.SuppressNotifications
	};
	const message = await thread.send(messagePayload);
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
	//remove all member that have a role that is ignored
	const allMemberToPing = toPing.filter(member => !checkRoleNotIgnored(member.roles));
	if (allMemberToPing.length > 0) {
		await message.edit(allMemberToPing.map(member => `<@${member.id}>`).join(" "));
	}
	await message.delete();

}

export function logInDev(...text: unknown[]) {
	if (process.env.NODE_ENV === "development") {
		console.log(text);
	}
}

