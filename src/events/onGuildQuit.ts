import type { Client } from "discord.js";
import db from "../database";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		// Remove cache timestamps for this guild to prevent memory leak
		db.cacheUpdateTimestamps.delete(guild.id);
		db.settings.delete(guild.id);
		//clean up pagination states related to this guild
		db.roleInStates.sweep((state) => state.guildId === guild.id);
		db.globalPaginationStates.sweep((_state, key) => {
			return key.split("_")[1] === guild.id;
		});
		db.messageToStateKey.sweep((stateKey) => {
			return stateKey.split("_")[1] === guild.id;
		});
		
	});
};
