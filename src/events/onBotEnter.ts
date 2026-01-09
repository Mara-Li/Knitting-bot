import type { Client } from "discord.js";
import { ALL_COMMANDS } from "../commands";
import db from "../database.js";
/**
 * When the bot arrive on a server, check all thread and add members that have the permission to view the thread
 * @param {Client} client - Discord.js Client
 * @returns {void}
 */

export default (client: Client): void => {
	client.on("guildCreate", async (guild) => {
		try {
			for (const command of ALL_COMMANDS) {
				await guild.commands.create(command.data);
			}
		} catch (error) {
			console.error(error);
		}
		db.loadDBFirstTime(guild.id);
	});
};
