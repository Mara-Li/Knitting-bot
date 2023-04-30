import { Client } from "discord.js";
import { commands } from "../commands";
import { logInDev } from "../utils";


export default (client: Client): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application) {
			return;
		}
		logInDev(`${client.user.username} is online`);
		const guilds = await client.guilds.cache;
		for (const guild of guilds) {
			for (const command of commands) {
				logInDev(`Adding ${command.data.name} to ${guild[1].name}`);
				await guild[1].commands.create(command.data);
			}
		}
	});
};
