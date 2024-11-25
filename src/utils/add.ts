import {
	type GuildMember,
	MessageFlags,
	type Role,
	type ThreadChannel,
	userMention,
} from "discord.js";
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
import { discordLogs } from "./index";

/**
 * Add a user to a thread, with verification the permission.
 * Check if the role is allowed by the settings for the thread.
 * @param thread {@link ThreadChannel} The thread to add the user
 * @param user {@link GuildMember} The user to add
 */
export async function addUserToThread(
	thread: ThreadChannel,
	user: GuildMember,
) {
	const guild = thread.guild.id;

	if (
		thread.permissionsFor(user).has("ViewChannel", true) &&
		(await checkIfUserNotInTheThread(thread, user))
	) {
		const fetchedMessage = await thread.messages.fetch();
		let message = fetchedMessage
			.filter((m) => m.author.id === thread.client.user.id)
			.first();

		if (getConfig(CommandName.followOnlyRoleIn, guild)) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			} else {
				message = await thread.send({
					content: EMOJI,
					flags: MessageFlags.SuppressNotifications,
				});
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			await discordLogs(
				guild,
				thread.client,
				`Add @${user.user.username} to #${thread.name}`,
			);
		} else if (!checkMemberRole(user.roles, "ignore")) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			} else {
				message = await thread.send({
					content: EMOJI,
					flags: MessageFlags.SuppressNotifications,
				});
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			await discordLogs(
				guild,
				thread.client,
				`Add @${user.user.username} to #${thread.name}`,
			);
		} else if (
			getConfig(CommandName.followOnlyRole, guild) &&
			checkMemberRole(user.roles, "follow")
		) {
			if (message) {
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			} else {
				message = await thread.send({
					content: EMOJI,
					flags: MessageFlags.SuppressNotifications,
				});
				await message.edit(userMention(user.id));
				await message.edit(EMOJI);
			}
			await discordLogs(
				guild,
				thread.client,
				`Add @${user.user.username} to #${thread.name}`,
			);
		}
	}
}

/**
 * Add a list to user to a thread, with verification the permission. After, send a message to ping the user and remove it.
 * @param thread
 * @param members
 */
export async function getUsersToPing(
	thread: ThreadChannel,
	members: GuildMember[],
) {
	const guild = thread.guild.id;
	const usersToBeAdded: GuildMember[] = [];
	for (const member of members) {
		if (
			thread.permissionsFor(member).has("ViewChannel", true) &&
			(await checkIfUserNotInTheThread(thread, member))
		) {
			if (
				getConfig(CommandName.followOnlyRoleIn, guild) &&
				checkMemberRoleIn("follow", member.roles, thread)
			) {
				usersToBeAdded.push(member);
			} else if (
				getConfig(CommandName.followOnlyRole, guild) &&
				checkMemberRole(member.roles, "follow") &&
				!getConfig(CommandName.followOnlyRoleIn, guild)
			) {
				usersToBeAdded.push(member);
			} else if (
				!getConfig(CommandName.followOnlyRole, guild) &&
				!checkMemberRole(member.roles, "ignore") &&
				!checkMemberRoleIn("ignore", member.roles, thread) &&
				!getConfig(CommandName.followOnlyRoleIn, guild)
			) {
				usersToBeAdded.push(member);
			}
		}
	}
	return usersToBeAdded;
}

/**
 * Same as above, but for a role
 * @param thread
 * @param roles
 */
export async function getRoleToPing(thread: ThreadChannel, roles: Role[]) {
	const guild = thread.guild.id;
	const roleToBeAdded: Role[] = [];
	for (const role of roles) {
		//check if all members of the role are in the thread
		const membersInTheThread = await thread.members.fetch();
		const membersOfTheRoleNotInTheThread = role.members.filter(
			(member) => !membersInTheThread.has(member.id),
		);
		if (
			role.name !== "@everyone" &&
			thread.permissionsFor(role).has("ViewChannel", true) &&
			role.members.size > 0 &&
			membersOfTheRoleNotInTheThread.size > 0
		) {
			if (checkRoleIn("follow", role, thread)) {
				roleToBeAdded.push(role);
			} else if (!getConfig(CommandName.followOnlyRoleIn, guild)) {
				if (
					getConfig(CommandName.followOnlyRole, guild) &&
					checkRole(role, "follow")
				) {
					roleToBeAdded.push(role);
				} else if (
					!getConfig(CommandName.followOnlyRoleIn, guild) &&
					!getConfig(CommandName.followOnlyRole, guild) &&
					!checkRole(role, "ignore") &&
					!checkRoleIn("ignore", role, thread)
				) {
					roleToBeAdded.push(role);
				}
			}
		}
	}
	return roleToBeAdded;
}

/**
 * Add all members that have the permission to view the thread, first check by their role and after add the member that have overwrite permission
 * if there is no role in the server, check all members directly
 * @param thread {@link ThreadChannel} The thread to add the user
 */
export async function addRoleAndUserToThread(thread: ThreadChannel) {
	const members = await thread.guild.members.fetch();
	const toPing: GuildMember[] = [];
	const rolesWithAccess: Role[] = thread.guild.roles.cache.toJSON();
	if (rolesWithAccess.length > 0) {
		try {
			getRoleToPing(thread, rolesWithAccess).then((roles) => {
				// biome-ignore lint/complexity/noForEach: <explanation>
				roles.forEach((role) => {
					toPing.push(...role.members.toJSON());
				});
			});
		} catch (error) {
			console.error(error);
		}
	} else {
		const guildMembers: GuildMember[] = members.toJSON();
		await getUsersToPing(thread, guildMembers).then((users) => {
			toPing.push(...users);
		});
	}
	//getConfig all member that have access to the thread (overwriting permission)
	const reloadMembers = await thread.guild.members.fetch();
	const memberWithAccess = getMemberPermission(reloadMembers, thread);
	if (memberWithAccess) {
		const memberWithAccessArray: GuildMember[] = memberWithAccess.toJSON();
		await getUsersToPing(thread, memberWithAccessArray).then((users) => {
			toPing.push(...users);
		});
	}
	if (toPing.length > 0) {
		const fetchedMessage = await thread.messages.fetch();
		const message =
			fetchedMessage
				.filter((m) => m.author.id === thread.client.user.id)
				.first() ??
			(await thread.send({
				content: EMOJI,
				flags: MessageFlags.SuppressNotifications,
			}));
		await message.edit(toPing.map((member) => `<@${member.id}>`).join(" "));
		await message.edit(EMOJI);
		await discordLogs(
			thread.guild.id,
			thread.client,
			`Add ${toPing.length} members to #${thread.name}:\n- ${toPing.map((member) => member.user.username).join("\n- ")}`,
		);
	}
}
