import { Client, GatewayIntentBits, Partials } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";
import * as process from "process";
import interactionCreate from "./listeners/interactionCreate";
import onBotEnter from "./listeners/onBotEnter";
import ready from "./listeners/ready";
import memberUpdate from "./listeners/memberUpdate";
import onThreadCreated from "./listeners/onThreadCreated";
import onChannelUpdate from "./listeners/onChannelUpdate";
import onNewMember from "./listeners/onNewMember";
import { commands } from "./commands";
import { logInDev } from "./utils";

dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.Channel],
});

export const emoji = process.env.MESSAGE && process.env.MESSAGE.trim().length > 0 ? process.env.MESSAGE : "🔄";


const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN ?? "0");

(async () => {
	try {
		logInDev("Started refreshing application (/) commands.");
		for (const guild of client.guilds.cache.values()) {
			// clean commands
			await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "0", guild.id),
				{ body: [] })
				.then(() => logInDev("Successfully deleted all guild commands."))
				.catch(console.error);
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "0", guild.id),
				{ body: commands },
			);
		}
		logInDev("Successfully reloaded slash commands.");
	} catch (error) {
		console.error(error);
	}
})();

try {
	ready(client);
	memberUpdate(client);
	onThreadCreated(client);
	onChannelUpdate(client);
	onNewMember(client);
	onBotEnter(client);
	interactionCreate(client);
} catch (error) {
	console.error(error);
}
client.login(process.env.DISCORD_TOKEN);

