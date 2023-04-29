import { Client, GatewayIntentBits, GuildMember, Partials, ThreadChannel } from "discord.js";
import dotenv from "dotenv";
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
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.Channel],
});


/**
 * Send an empty message, and after, edit it with mentionning the user
 * @param {GuildMember} user The user to mention
 * @param {ThreadChannel} channel The channel to send the message
 */
export async function sendMessageAndEditPing(user: GuildMember, channel: ThreadChannel) {
	const message = await channel.send("//");
	await message.edit(`<@${user.id}>`);
	await message.delete();
}

ready(client);
memberUpdate(client);
onThreadCreated(client);
onChannelUpdate(client);
onNewMember(client);

client.login(process.env.DISCORD_TOKEN);

