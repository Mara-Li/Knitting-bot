import { Client, ThreadChannel } from "discord.js";
import { addUserToThread } from "../utils";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for new member event, add them to thread they can see
 */

export default (client: Client): void => {
	client.on("guildMemberAdd", async (member) => {
		console.log(`${member.user.username} joined the server`);
		const guild = member.guild;
		const channels = guild.channels.cache.filter(channel => channel.isThread());
		for (const channel of channels.values()) {
			const threadChannel = channel as ThreadChannel;
			//check thread permission with user role
			await addUserToThread(threadChannel, member);
		}
		
	});
};
