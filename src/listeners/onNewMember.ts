import { Client, ThreadChannel } from "discord.js";
import { sendMessageAndEditPing } from "../index";

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
			if (threadChannel.permissionsFor(member).has("ViewChannel")) {
				//add user to thread
				await sendMessageAndEditPing(member, threadChannel);
				console.log(`Add @${member.user.username} to #${threadChannel.name}`);
			}
		}
		
	});
};
