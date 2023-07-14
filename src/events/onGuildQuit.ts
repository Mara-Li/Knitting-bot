import { Client } from "discord.js";
import { deleteGuild } from "../maps";
import { logInDev } from "../utils";

export default (client: Client):void => {
	client.on("guildDelete", async (guild) => {
		logInDev(`Bot removed from ${guild.name} (${guild.id})`);
		deleteGuild(guild.id);
	});
};
