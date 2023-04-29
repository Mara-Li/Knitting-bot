import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import ready from "./listeners/ready";
import memberUpdate from "./listeners/memberUpdate";
import onThreadCreated from "./listeners/onThreadCreated";
import onChannelUpdate from "./listeners/onChannelUpdate";

dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.Channel],
});

ready(client);
memberUpdate(client);
onThreadCreated(client);
onChannelUpdate(client);

client.login(process.env.DISCORD_TOKEN);

