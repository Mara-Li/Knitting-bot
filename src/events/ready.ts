import process from "node:process";
import type { Client } from "discord.js";
import dotenv from "dotenv";
import { ALL_COMMANDS } from "../commands";
import { VERSION } from "../index";

let config = dotenv.config({ path: ".env", quiet: true }).parsed;
if (process.env.ENV === "production") {
	config = dotenv.config({ path: ".env.prod", quiet: true }).parsed;
}

export default (client: Client): void => {
	client.on("clientReady", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) return;

		console.info(`${client.user.username} is online; v.${VERSION}`);

		const serializedCommands = ALL_COMMANDS.map((command) => command.data.toJSON());
		const guilds = Array.from(client.guilds.cache.values());
		if (guilds.length === 0) return;

		console.info(`Registering commands on ${guilds.length} servers...`);
		const guildPromises = guilds.map(async (guild) => {
			try {
				await guild.commands.set(serializedCommands);
			} catch (error) {
				console.error(`[${guild.name}] Failure on registering commands:`, error);
			}
		});
		await Promise.all(guildPromises);
	});
};
