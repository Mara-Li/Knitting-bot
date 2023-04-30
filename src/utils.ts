import { Collection, GuildMember, Role, TextChannel, ThreadChannel, ThreadMember } from "discord.js";



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
	return [];
}

/**
 * Add a user to a thread, with verification the permission. After, send a message to ping the user and remove it.
 * @param {ThreadChannel} thread The thread to add the user and send the message
 * @param {GuildMember} member The member to add to the thread
 */
export async function addUserToThread(thread: ThreadChannel, member: GuildMember) {
	if (thread.permissionsFor(member).has("ViewChannel", true)) {
		const message = await thread.send("//");
		await message.edit(`<@${member.id}>`);
		await message.delete();
		console.log(`Add @${member.user.username} to #${thread.name}`);
	}
}

/**
 * Same as above, but for a role
 * @param {ThreadChannel} thread The thread to add the role and send the message
 * @param {Role} role The role to add to the thread
 */
export async function sendMessageRole(thread: ThreadChannel, role: Role) {
	if (role.name === "@everyone") return;
	if (thread.permissionsFor(role).has("ViewChannel", true)) {
		const message = await thread.send("//");
		await message.edit(`<@&${role.id}>`);
		await message.delete();
		console.log(`Add @${role.name} to #${thread.name}`);
	}
}

/**
 * Remove a user from a thread, with verification the permission
 * @param {ThreadChannel} thread The thread to remove the user
 * @param {GuildMember} member The member to remove from the thread
 */
export async function removeUserFromThread(thread: ThreadChannel, member: GuildMember) {
	if (!thread.permissionsFor(member).has("ViewChannel", true)) {
		await thread.members.remove(member.id);
		console.log(`Remove @${member.user.username} from #${thread.name}`);
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
 * Add all members that have the permission to view the thread, first check by their role and after add the member that have overwrite permission
 * if there is no role in the server, check all members directly
 * @param {ThreadChannel} thread The thread to add the members
 */
export async function addRoleAndUserToThread(thread: ThreadChannel) {
	const members = await thread.guild.members.fetch();
	const rolesWithAccess: Role[] = thread
		.guild.roles.cache
		.filter((role) => {
			const permissions = role.permissions.toArray();
			return permissions.includes("ViewChannel");
		})
		.toJSON();
	if (rolesWithAccess.length > 0) {
		for (const role of rolesWithAccess) {
			//if no member in the role, skip
			if (role.members.size > 0) {
				for (const member of role.members.values()) {
					if (await checkIfUserNotInTheThread(thread, member)) {
						await sendMessageRole(thread, role);
						break;
					}
					
				}
			}
		}
	} else {
		for (const member of members.values()) {
			if (await checkIfUserNotInTheThread(thread, member)) {
				await addUserToThread(thread, member);
			}
		}
	}
	//get all member that have access to the thread (overwriting permission)
	const memberWithAccess = getMemberPermission(members, thread);
	for (const member of memberWithAccess.values()) {
		if (await checkIfUserNotInTheThread(thread, member)) {
			await addUserToThread(thread, member);
		}
	}
}
