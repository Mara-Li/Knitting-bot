import { ChannelType, Client, ThreadChannel } from "discord.js";
import { sendMessageAndEditPing } from "../index";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for the threadCreate event.
 * It will add all users that have the permission to view the thread.
 */
export default (client: Client): void => {
	client.on("threadCreate", async (thread: ThreadChannel) => {
		//return if the thread is not a public thread
		if (thread.type !== ChannelType.PublicThread) return;
		console.log(`Thread ${thread.name} created!`);
		//get all members of the server
		const members = await thread.guild.members.fetch();
		//filter members that have the permission to view the thread
		const allowedMembers = members.filter(member => {
			if (!thread.parent) return false;
			const memberPermissions = thread.parent.permissionsFor(member);
			return (
				memberPermissions.has("ViewChannel", true) &&
                memberPermissions.has("ReadMessageHistory", true)
			);
		});
		for (const member of allowedMembers.values()) {
			console.log(`Adding ${member.user.username} to ${thread.name}`);
			await sendMessageAndEditPing(member, thread);
		}
	});
};
