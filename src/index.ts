import dotenv from 'dotenv';
import ready from './listeners/ready';
import memberUpdate from './listeners/memberUpdate';
import onThreadCreated from './listeners/onThreadCreated';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import onThreadUpdate from './listeners/onThreadUpdate';

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
onThreadUpdate(client);

client.login(process.env.DISCORD_TOKEN);

console.log('Bot is running!');
