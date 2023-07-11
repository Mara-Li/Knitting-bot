import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as process from "process";
import * as pkg from "../package.json";
import interactionCreate from "./listeners/interactionCreate";
import onBotEnter from "./listeners/onBotEnter";
import onChannelDelete from "./listeners/delete/onChannelDelete";
import onRoleDeleted from "./listeners/delete/onRoleDeleted";
import onThreadDeleted from "./listeners/delete/onThreadDeleted";
import onGuildQuit from "./listeners/onGuildQuit";
import ready from "./listeners/ready";
import memberUpdate from "./listeners/updated/memberUpdate";
import onThreadCreated from "./listeners/created/onThreadCreated";
import onChannelUpdate from "./listeners/updated/onChannelUpdate";
import onNewMember from "./listeners/created/onNewMember";

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

export const EMOJI = process.env.MESSAGE && process.env.MESSAGE.trim().length > 0 ? process.env.MESSAGE : "🔄";
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

