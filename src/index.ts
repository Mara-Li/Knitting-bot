import process from "node:process";
import {Client, GatewayIntentBits, Partials} from "discord.js";
import dotenv from "dotenv";
import "uniformize";
import {
	interactionCreate,
	memberUpdate,
	onBotEnter,
	onChannelDelete,
	onChannelUpdate,
	onGuildQuit,
	onMessageDelete,
	onNewMember,
	onPinsUpdate,
	onRoleDeleted,
	onThreadCreated,
	onThreadDeleted,
	ready,
} from "./events";

dotenv.config({ path: ".env", quiet: true });


const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
	],
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.ThreadMember,
		Partials.User,
	],
});

try {
	ready(client);
	memberUpdate(client);
	onThreadCreated(client);
	onChannelUpdate(client);
	onNewMember(client);
	onBotEnter(client);
	onChannelDelete(client);
	onMessageDelete(client);
	onRoleDeleted(client);
	onThreadDeleted(client);
	interactionCreate(client);
	onGuildQuit(client);
	onPinsUpdate(client);
} catch (error) {
	console.error(error);
}
client.login(process.env.DISCORD_TOKEN).then(() => {
	console.log("Bot logged in successfully.");
});
