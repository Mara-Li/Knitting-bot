import { REST } from "@discordjs/rest";
import { Client, Routes } from "discord.js";
import dotenv from "dotenv";
import process from "process";
import { commands } from "../commands";
import { destroyDB, exportDB } from "../maps";
import { logInDev } from "../utils";
import { VERSION } from "../index";
dotenv.config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "0");

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
			logInDev(`Load in ${guild.name}`);
			//delete all commands
			guild.client.application?.commands.cache.forEach( (command) => {
				logInDev(`Delete ${command.name}`);
				command.delete();
			});
			//add all commands
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
				{ body: serializeCmds }
			);
			logInDev(`Load in ${guild.name} done`);
		}
		//destroy all maps
		//destroyDB();
		//exportDB();
	});
};
