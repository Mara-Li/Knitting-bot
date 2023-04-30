import { Client, ThreadChannel } from "discord.js";
import { addUserToThread, checkIfUserNotInTheThread } from "../utils";


/**
 * When the bot arrive on a server, check all thread and add members that have the permission to view the thread
 * @param {Client} client - Discord.js Client
 * @returns {void}
 */

export default (client: Client):void => {
	client.on("guildCreate", async (guild) => {
		console.log(`${client.user?.username} has been added to ${guild.name}`);
		const threads = guild.channels.cache.filter(channel => channel.isThread());
		const members = await guild.members.fetch();
		for (const thread of threads.values()) {
			const threadChannel = thread as ThreadChannel;
			for (const member of members.values()) {
				if (await checkIfUserNotInTheThread(threadChannel, member)) {
					await addUserToThread(threadChannel, member);
				}
			}
		}
	});
};
