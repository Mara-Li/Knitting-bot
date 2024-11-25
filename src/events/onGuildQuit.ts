import { Client } from "discord.js";
import { deleteGuild } from "../maps";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		deleteGuild(guild.id);
	});
};
