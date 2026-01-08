import type { Client } from "discord.js";
import { deleteGuild } from "../maps";
import { removeCacheForGuild } from "../utils";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		// Remove cache timestamps for this guild to prevent memory leak
		removeCacheForGuild(guild.id);
		deleteGuild(guild.id);
	});
};
