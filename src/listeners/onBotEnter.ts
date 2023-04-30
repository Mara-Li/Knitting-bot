import { Client, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread} from "../utils";


/**
 * When the bot arrive on a server, check all thread and add members that have the permission to view the thread
 * @param {Client} client - Discord.js Client
 * @returns {void}
 */

export default (client: Client):void => {
	client.on("guildCreate", async (guild) => {
		console.log(`${client.user?.username} has been added to ${guild.name}`);
		const threads = guild.channels.cache.filter(channel => channel.isThread());
		for (const thread of threads.values()) {
			const threadChannel = thread as ThreadChannel;
			await addRoleAndUserToThread(threadChannel);
		}
	});
};
