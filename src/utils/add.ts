import { userMention } from "@discordjs/formatters";
import { GuildMember, MessageFlags, MessagePayloadOption, Role, ThreadChannel } from "discord.js";
import { emoji } from "../index";
import { CommandName } from "../interface";
import { getConfig } from "../maps";
import {
	checkIfUserNotInTheThread,
	checkMemberRole,
	checkMemberRoleIn,
	checkRole,
	checkRoleIn,
	getMemberPermission,
} from "./data_check";
import { logInDev } from "./index";


export async function addUserToThread(thread: ThreadChannel, user: GuildMember) {
	if (thread.permissionsFor(user).has("ViewChannel", true) && await checkIfUserNotInTheThread(thread, user)) {

		const fetchedMessage = await thread.messages.fetch();
		let message = fetchedMessage.filter(m => m.author.id === thread.client.user.id).first();
		
		if (getConfig(CommandName.followOnlyRoleIn)) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(emoji);
			}
			else {
				message = await thread.send({
					content: emoji,
					flags: MessageFlags.SuppressNotifications
				});
				await message.edit(userMention(user.id));
				await message.edit(emoji);
			}
		} else if (!checkMemberRole(user.roles, "ignore")) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(emoji);
			}
			else {
				message = await thread.send({
					content: emoji,
					flags: MessageFlags.SuppressNotifications
				});
				await message.edit(userMention(user.id));
				await message.edit(emoji);
			}
			logInDev(`Add @${user.user.username} to #${thread.name}`);
		} else if (getConfig(CommandName.followOnlyRole) && checkMemberRole(user.roles, "follow")) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(emoji);
			}
			else {
				message = await thread.send({
					content: emoji,
					flags: MessageFlags.SuppressNotifications
				});
				await message.edit(userMention(user.id));
				await message.edit(emoji);
			}
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
			if (getConfig(CommandName.followOnlyRoleIn) && checkMemberRoleIn("follow", member.roles, thread)) {
				logInDev(`followOnlyRoleIn: @${member.user.username} is in a followed role in #${thread.name}`);
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name}`);
			} else if (getConfig(CommandName.followOnlyRole) && checkMemberRole(member.roles, "follow") && !getConfig(CommandName.followOnlyRoleIn)) {
				logInDev(`followOnlyRole: @${member.user.username} is in a followed role`);
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name}`);
			} else if (!getConfig(CommandName.followOnlyRole) && !checkMemberRole(member.roles, "ignore") && !checkMemberRoleIn("ignore", member.roles, thread) && !getConfig(CommandName.followOnlyRoleIn)) {
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
			logInDev(`@${role.name} role ignored for thread ?:`, checkRoleIn("ignore", role, thread));
			if (checkRoleIn("follow",role, thread)) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}`);
			} else if (getConfig(CommandName.followOnlyRole) && checkRole(role, "follow")) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}`);
			} else if (!getConfig(CommandName.followOnlyRole) && !checkRole(role, "ignore") && !checkRoleIn("ignore", role, thread)) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}`);
			}
		}
	}
	return roleToBeAdded;
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
	//getConfig all member that have access to the thread (overwriting permission)
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
		const fetchedMessage = await thread.messages.fetch();
		const message = fetchedMessage.filter(m => m.author.id === thread.client.user.id).first() ?? await thread.send(messagePayload);
		await message.edit(toPing.map(member => `<@${member.id}>`).join(" "));
		await message.edit(emoji);
	}
}


