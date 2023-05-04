import { Client } from "discord.js";
import { commands } from "../commands";
import { logInDev } from "../utils";


export default (client: Client): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application) {
			return;
		}

		console.info(`${client.user.username} is online`);
		const guilds = await client.guilds.cache;
		//remove all commands
		for (const guild of guilds) {
			await guild[1].commands.set([]);
			for (const command of commands) {
				await guild[1].commands.create(command.data);
				logInDev(`Command ${command.data.name} created in ${guild[1].name}`);
			}
		}
	});
};
