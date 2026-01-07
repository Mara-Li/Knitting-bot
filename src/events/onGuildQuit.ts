import type { Client } from "discord.js";
import { clearGuildMessageCache, deleteGuild } from "../maps";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		deleteGuild(guild.id);
		clearGuildMessageCache(guild.id);
	});
};
