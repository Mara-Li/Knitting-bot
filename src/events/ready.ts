import { Client, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import process from "process";
import { commands } from "../commands";
import { DESTROY_DATABASE, VERSION } from "../index";
import { destroyDB } from "../maps";
import { logInDev } from "../utils";

let config = dotenv.config({ path: ".env" }).parsed;
if (process.env.ENV === "production") {
	config = dotenv.config({ path: ".env.prod" }).parsed;
}
const rest = new REST().setToken(config?.DISCORD_TOKEN ?? "0");

export default (client: Client): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) {
			return;
		}

		console.info(`${client.user.username} is online; v.${VERSION}`);
		const serializeCmds = commands.map( (command) => {
			return command.data.toJSON();
		});
		for (const guild of client.guilds.cache.values()) {
			//delete all commands
			guild.client.application?.commands.cache.forEach( (command) => {
				command.delete();
			});
			//add all commands
			await rest.put(
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				Routes.applicationGuildCommands(config?.CLIENT_ID, guild.id),
				{ body: serializeCmds }
			);
		}
		//destroy all maps
		if (DESTROY_DATABASE) destroyDB();
	});
};
