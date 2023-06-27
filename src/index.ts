import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as process from "process";
import interactionCreate from "./listeners/interactionCreate";
import onBotEnter from "./listeners/onBotEnter";
import ready from "./listeners/ready";
import memberUpdate from "./listeners/memberUpdate";
import onThreadCreated from "./listeners/onThreadCreated";
import onChannelUpdate from "./listeners/onChannelUpdate";
import onNewMember from "./listeners/onNewMember";

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

