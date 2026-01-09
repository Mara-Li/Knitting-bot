import type { Client } from "discord.js";
import db from "../database";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		// Remove cache timestamps for this guild to prevent memory leak
		db.cacheUpdateTimestamps.delete(guild.id);
		db.settings.delete(guild.id);
	});
};
