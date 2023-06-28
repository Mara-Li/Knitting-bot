import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as process from "process";
import interactionCreate from "./listeners/interactionCreate";
import onBotEnter from "./listeners/onBotEnter";
import onChannelDelete from "./listeners/delete/onChannelDelete";
import onRoleDeleted from "./listeners/delete/onRoleDeleted";
import onThreadDeleted from "./listeners/delete/onThreadDeleted";
import ready from "./listeners/ready";
import memberUpdate from "./listeners/updated/memberUpdate";
import onThreadCreated from "./listeners/created/onThreadCreated";
import onChannelUpdate from "./listeners/updated/onChannelUpdate";
import onNewMember from "./listeners/created/onNewMember";

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
	onChannelDelete(client);
	onRoleDeleted(client);
	onThreadDeleted(client);
	interactionCreate(client);
} catch (error) {
	console.error(error);
}
client.login(process.env.DISCORD_TOKEN);

