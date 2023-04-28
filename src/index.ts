import dotenv from 'dotenv';
import ready from './listeners/ready';
import memberUpdate from './listeners/memberUpdate';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

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

client.login(process.env.DISCORD_TOKEN);

console.log('Bot is running!');
