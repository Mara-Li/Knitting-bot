import type { Client, Guild } from "discord.js";
import db from "../database";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		// Remove cache timestamps for this guild to prevent memory leak
		db.cacheUpdateTimestamps.delete(guild.id);
		db.settings.delete(guild.id);
		//clean up pagination states related to this guild
		db.roleInStates.sweep((state) => state.guildId === guild.id);
		db.globalPaginationStates.sweep((_state, key) => {
			return compareToGuild(key, guild);
		});
		db.messageToStateKey.sweep((stateKey) => {
			return compareToGuild(stateKey, guild);
		});
	});
};

function compareToGuild(stateKey: string, guild: Guild): boolean {
	const parts = stateKey.split("_");
	return parts.length >= 2 && parts[1] === guild.id;
}