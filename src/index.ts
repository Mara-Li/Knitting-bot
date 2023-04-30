import { Client, GatewayIntentBits, Partials } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import dotenv from "dotenv";
import interactionCreate from "./listeners/interactionCreate";
import onBotEnter from "./listeners/onBotEnter";
import ready from "./listeners/ready";
import memberUpdate from "./listeners/memberUpdate";
import onThreadCreated from "./listeners/onThreadCreated";
import onChannelUpdate from "./listeners/onChannelUpdate";
import onNewMember from "./listeners/onNewMember";
import { commands } from "./commands";


dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.Channel],
});

const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN ?? "0");

(async () => {
	try {
		console.log("Started refreshing application (/) commands.");

		// Enregistrement des commandes Slash pour chaque serveur que le bot rejoint
		for (const guild of client.guilds.cache.values()) {
			for (const command of commands) {
				await rest.put(
					Routes.applicationGuildCommands(process.env.CLIENT_ID ?? "0", guild.id),
					{ body: command },
				);
			}

			console.log(`Slash commands registered for ${guild.name}`);
		}

		console.log("Successfully reloaded application (/) commands.");
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
	console.log(error);
}
client.login(process.env.DISCORD_TOKEN);

