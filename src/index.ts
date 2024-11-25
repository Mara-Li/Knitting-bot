import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as process from "node:process";
import * as pkg from "../package.json";
import onNewMember from "./events/created/onNewMember";
import onThreadCreated from "./events/created/onThreadCreated";
import onChannelDelete from "./events/delete/onChannelDelete";
import onRoleDeleted from "./events/delete/onRoleDeleted";
import onThreadDeleted from "./events/delete/onThreadDeleted";
import interactionCreate from "./events/interactionCreate";
import onBotEnter from "./events/onBotEnter";
import onGuildQuit from "./events/onGuildQuit";
import ready from "./events/ready";
import memberUpdate from "./events/updated/memberUpdate";
import onChannelUpdate from "./events/updated/onChannelUpdate";

let config = dotenv.config({ path: ".env" });
if (process.env.ENV === "production") {
	config = dotenv.config({ path: ".env.prod" });
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.Channel],
});

export const EMOJI = process.env.MESSAGE && process.env.MESSAGE.trim().length > 0 ? process.env.MESSAGE : "_ _";
export const VERSION = pkg.version ?? "0.0.0";
export const DESTROY_DATABASE = process.env.DESTROY === "true";

export const INFO_EMOJI = {
	"github" : process.env.GITHUB_EMOJI ?? "??",
	"kofi" : process.env.KOFI ?? "??",
	"discord" : process.env.DISCORD ?? "??",
};

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
	onGuildQuit(client);
} catch (error) {
	console.error(error);
}
client.login(config.parsed?.DISCORD_TOKEN);

