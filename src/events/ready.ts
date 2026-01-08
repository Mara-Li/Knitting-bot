import type { Client } from "discord.js";
import { ALL_COMMANDS } from "../commands";
import { VERSION } from "../index";

export default (client: Client): void => {
	client.on("clientReady", async () => {
		if (!client.user || !client.application) return;

		console.info(`${client.user.username} is online; v.${VERSION}`);

		const serializedCommands = ALL_COMMANDS.map((command) => command.data.toJSON());
		const guilds = Array.from(client.guilds.cache.values());
		if (guilds.length === 0) {
			console.warn("Bot is not in any guilds; skipping command registration.");
			return;
		}

		console.info(`Registering commands on ${guilds.length} servers...`);
		const guildPromises = guilds.map(async (guild) => {
			try {
				await guild.commands.set(serializedCommands);
			} catch (error) {
				console.error(`[${guild.name}] Failure on registering commands:`, error);
			}
		});
		await Promise.all(guildPromises);
		console.info("Done registering commands.");
	});
};
