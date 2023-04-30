import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
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

try {
	ready(client);
	memberUpdate(client);
	onThreadCreated(client);
	onChannelUpdate(client);
	onNewMember(client);
	onBotEnter(client);
} catch (error) {
	console.log(error);
}
client.login(process.env.DISCORD_TOKEN);

