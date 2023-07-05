import { GuildMember, MessageFlags, MessagePayloadOption, Role, ThreadChannel, userMention } from "discord.js";
import { EMOJI } from "../index";
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

/**
 * Add a user to a thread, with verification the permission.
 * Check if the role is allowed by the settings for the thread.
 * @param thread {@link ThreadChannel} The thread to add the user
 * @param user {@link GuildMember} The user to add
 */
export async function addUserToThread(thread: ThreadChannel, user: GuildMember) {
	const guild = thread.guild.id;
	if (thread.permissionsFor(user).has("ViewChannel", true) && await checkIfUserNotInTheThread(thread, user)) {

		const fetchedMessage = await thread.messages.fetch();
		let message = fetchedMessage.filter(m => m.author.id === thread.client.user.id).first();
		
		if (getConfig(CommandName.followOnlyRoleIn, guild)) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			else {
				message = await thread.send({
					content: EMOJI,
					flags: MessageFlags.SuppressNotifications
				});
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
		} else if (!checkMemberRole(user.roles, "ignore")) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			else {
				message = await thread.send({
					content: EMOJI,
					flags: MessageFlags.SuppressNotifications
				});
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			logInDev(`Add @${user.user.username} to #${thread.name}`);
		} else if (getConfig(CommandName.followOnlyRole, guild) && checkMemberRole(user.roles, "follow")) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			else {
				message = await thread.send({
					content: EMOJI,
					flags: MessageFlags.SuppressNotifications
				});
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			logInDev(`Add @${user.user.username} to #${thread.name}`);
		}
	}
	logInDev("DONE");
}

/**
 * Add a list to user to a thread, with verification the permission. After, send a message to ping the user and remove it.
 * @param {@link ThreadChannel} thread The thread to add the user and send the message
 * @param {@link GuildMember} members The member to add to the thread
 */
export async function getUsersToPing(thread: ThreadChannel, members: GuildMember[]) {
	const guild = thread.guild.id;
	const usersToBeAdded: GuildMember[] = [];
	for (const member of members) {
		if (thread.permissionsFor(member).has("ViewChannel", true) && await checkIfUserNotInTheThread(thread, member)) {
			
			if (getConfig(CommandName.followOnlyRoleIn, guild) && checkMemberRoleIn("follow", member.roles, thread)) {
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name} - Rules:\n- Follow Only Role In\n- Role followed in the thread`);
			} else if (getConfig(CommandName.followOnlyRole, guild) && checkMemberRole(member.roles, "follow") && !getConfig(CommandName.followOnlyRoleIn, guild)) {
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name} - Rules:\n- Follow Only Role\n- Role followed\n- Not follow Only Role In`);
			} else if (!getConfig(CommandName.followOnlyRole, guild) && !checkMemberRole(member.roles, "ignore") && !checkMemberRoleIn("ignore", member.roles, thread) && !getConfig(CommandName.followOnlyRoleIn, guild)) {
				usersToBeAdded.push(member);
				logInDev(`Add @${member.user.username} to #${thread.name} - Rules :\n- Not follow Only Role\n- Role not ignored globally\n- Role not ignored in the thread\n- Not follow Only Role In`);
			}
		}
	}
	return usersToBeAdded;
}

/**
 * Same as above, but for a role
 * @param {@link ThreadChannel} thread The thread to add the role and send the message
 * @param {@link Role[]} roles The role to add to the thread
 */
export async function getRoleToPing(thread: ThreadChannel, roles: Role[]) {
	const guild = thread.guild.id;
	const roleToBeAdded: Role[] = [];
	for (const role of roles) {
		//check if all members of the role are in the thread
		const membersInTheThread = await thread.members.fetch();
		const membersOfTheRoleNotInTheThread = role.members.filter(member => !membersInTheThread.has(member.id));
		if (role.name !== "@everyone" && thread.permissionsFor(role).has("ViewChannel", true) && role.members.size >0 && membersOfTheRoleNotInTheThread.size > 0) {
			if (checkRoleIn("follow",role, thread)) {
				roleToBeAdded.push(role);
				logInDev(`Add @${role.name} to #${thread.name}\n **Role Followed in thread**`);
			} else if (!getConfig(CommandName.followOnlyRoleIn, guild)) {
				if (getConfig(CommandName.followOnlyRole, guild) && checkRole(role, "follow")) {
					roleToBeAdded.push(role);
					logInDev(`Add @${role.name} to #${thread.name}\n **FollowOnlyRole & Followed**`);
				} else if (!getConfig(CommandName.followOnlyRoleIn, guild) && !getConfig(CommandName.followOnlyRole, guild) && !checkRole(role, "ignore") && !checkRoleIn("ignore", role, thread)) {
					roleToBeAdded.push(role);
					logInDev(`Add @${role.name} to #${thread.name}\n **Not FollowOnlyRole & Not Ignored && Not ignored for this thread**`);
				}
			} else {
				logInDev(`@${role.name} not added to #${thread.name}\n **Role not followed in thread**`);
			}
		}
	}
	return roleToBeAdded;
}


/**
 * Add all members that have the permission to view the thread, first check by their role and after add the member that have overwrite permission
 * if there is no role in the server, check all members directly
 * @param {@link ThreadChannel} thread The thread to add the members
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
			content: EMOJI,
			flags: MessageFlags.SuppressNotifications
		};
		const fetchedMessage = await thread.messages.fetch();
		const message = fetchedMessage.filter(m => m.author.id === thread.client.user.id).first() ?? await thread.send(messagePayload);
		await message.edit(toPing.map(member => `<@${member.id}>`).join(" "));
		await message.edit(EMOJI);
	}
	logInDev("DONE");
}


