import type { Client } from "discord.js";
import { clearGuildMessageCache, deleteGuild } from "../maps";
import { logInDev } from "../utils";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		deleteGuild(guild.id);
		clearGuildMessageCache(guild.id);
		logInDev(`Guild ${guild.name} has been removed from the database.`);
	});
};
