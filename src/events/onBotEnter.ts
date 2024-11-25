import { Client } from "discord.js";
import { commands } from "../commands";
import { loadDBFirstTime } from "../maps";
import { logInDev } from "../utils";

/**
 * When the bot arrive on a server, check all thread and add members that have the permission to view the thread
 * @param {Client} client - Discord.js Client
 * @returns {void}
 */

export default (client: Client): void => {
	client.on("guildCreate", async (guild) => {
		try {
			for (const command of commands) {
				await guild.commands.create(command.data);
			}
		} catch (error) {
			console.error(error);
		}
		console.log(guild.preferredLocale);
		loadDBFirstTime(guild.id);
	});
};
