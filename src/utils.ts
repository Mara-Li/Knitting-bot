import { Collection, GuildMember, TextChannel, ThreadChannel, ThreadMember } from "discord.js";

/**
 * Send an empty message, and after, edit it with mentionning the user
 * @param {GuildMember} user The user to mention
 * @param {ThreadChannel} channel The channel to send the message
 */
export async function sendMessageAndEditPing(user: GuildMember, channel: ThreadChannel) {
	const message = await channel.send("//");
	await message.edit(`<@${user.id}>`);
	await message.delete();
}

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

export async function addUserToThread(thread: ThreadChannel, member: GuildMember) {
	if (thread.permissionsFor(member).has("ViewChannel", true)) {
		await sendMessageAndEditPing(member, thread);
		console.log(`Add @${member.user.username} to #${thread.name}`);
	}
}

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
