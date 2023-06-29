import {
	CategoryChannel,
	Collection,
	ForumChannel,
	GuildMember,
	GuildMemberRoleManager,
	Role,
	TextChannel,
	ThreadChannel,
	ThreadMember,
} from "discord.js";
import { CommandName, TypeName } from "../interface";
import { getConfig, getMaps, getRole, getRoleIn } from "../maps";
import { logInDev } from "./index";

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

export function checkMemberRole(role: GuildMemberRoleManager, on: "ignore" | "follow") {
	if (on==="follow" && getConfig(CommandName.followOnlyRole) === "false") return true;
	const roles = getRole(on);
	const allMemberRoles = role.cache;
	return allMemberRoles.some(memberRole => roles.some(r => r.id === memberRole.id));
}

export function checkRole(role: Role, on: "ignore" | "follow") {
	if (on === "follow" && getConfig(CommandName.followOnlyRole) === "false") return true;
	const allFollowedRoles = getRole(on);
	return allFollowedRoles.some(followedRole => followedRole.id === role.id);
}

export function checkMemberRoleIn(on: "follow" | "ignore", roleManager: GuildMemberRoleManager, thread: ThreadChannel) {
	if (on === "follow" && !getConfig(CommandName.followOnlyRoleIn)) return true;
	logInDev(`THREAD CHECKED : ${thread.name}`);
	const roles = roleManager.cache;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleIn = getRoleIn(on);
	return roles.some(role => {
		const find = roleIn.find(r => r.role.id === role.id);
		if (!find) {
			return on !== "follow";
		}
		return find.channels.some(channel => {
			if (channel.id === thread.id) return true;
			else if (channel.id === parentChannel?.id) return true;
			else if (channel.id === categoryOfParent?.id) return true;
			return false;
		});
	});
}

export function checkRoleIn(on: "follow"|"ignore", role: Role, thread: ThreadChannel) {
	if (on === "follow" && !getConfig(CommandName.followOnlyRoleIn)) return true;
	const parentChannel = thread.parent;
	const categoryOfParent = parentChannel?.parent;
	const roleIns = getRoleIn(on);
	const find = roleIns.find(followedRole => followedRole.role.id === role.id);
	if (!find) return false;
	return find.channels.some(channel => {
		if (channel === thread) return true;
		else if (channel === parentChannel) return true;
		else if (channel === categoryOfParent) return true;
		return false;
	});
	
}


export function checkThread(channel: ThreadChannel, on: "ignore" | "follow") {
	logInDev(`Check if #${channel.name} is ${on}`);
	const parentChannels = channel.parent;
	const categoryOfParent = parentChannels?.parent;
	const followedThread = getMaps(on,TypeName.thread) as ThreadChannel[] || [];
	const followedChannels = getMaps(on,TypeName.channel) as TextChannel[] || [];
	const followedCategories = getMaps(on,TypeName.category) as CategoryChannel[] || [];
	const followedForum = getMaps(on,TypeName.forum) as ForumChannel[] || [];
	return followedChannels.some(followedChannel => followedChannel.id === channel.id) ||
		followedForum.some(followedForum => followedForum.id === channel.id) ||
		followedCategories.some(followedCategory => followedCategory.id === categoryOfParent?.id) ||
		followedThread.some(followedThread => followedThread.id === channel.id);
}

/**
 * Get all members that have the permission to view the thread
 * @param {Collection<string, GuildMember>} members All members of the server
 * @param {ThreadChannel | TextChannel} thread The thread to check
 * @param {boolean} allow If true, getConfig all members that have the permission to view the thread, else getConfig all members that don't have the permission to view the thread
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
