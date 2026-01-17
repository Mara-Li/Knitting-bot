import type { Client } from "discord.js";
import { ALL_COMMANDS } from "../commands";
import { VERSION } from "../interfaces";

export default (client: Client): void => {
	client.on("clientReady", async () => {
		if (!client.user || !client.application) return;

		console.info(`${client.user.username} is online; v.${VERSION}`);

		const serializedCommands = ALL_COMMANDS.map((command) => command.data.toJSON());
		await client.application.commands.set(serializedCommands);
		console.info("Done registering commands.");
	});
};
