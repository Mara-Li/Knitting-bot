import process from "node:process";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as pkg from "../package.json" with { type: "json" };
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

let config = dotenv.config({ path: ".env", quiet: true });
if (process.env.ENV === "production") {
	config = dotenv.config({ path: ".env.prod", quiet: true });
}

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

export const EMOJI =
	process.env.MESSAGE && process.env.MESSAGE.trim().length > 0
		? process.env.MESSAGE
		: "_ _";
export const VERSION = pkg.version ?? "0.0.0";
export const DESTROY_DATABASE = process.env.DESTROY === "true";

export const INFO_EMOJI = {
	discord: process.env.DISCORD ?? "??",
	github: process.env.GITHUB_EMOJI ?? "??",
	kofi: process.env.KOFI ?? "??",
};

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
client.login(config.parsed?.DISCORD_TOKEN).then(() => {
	console.log("Bot logged in successfully.");
});
