import process from "node:process";
import { ChannelType, type Client, type Guild } from "discord.js";
import { CommandName } from "../interface";
import { getConfig } from "../maps";

/**
 * Log messages in development mode with timestamp and caller information
 * @param text - Messages to log
 */
export function logInDev(...text: unknown[]) {
	const time = new Date();
	const timeString = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
	/** Get the called function name */
	const stack = new Error().stack;
	const caller = stack?.split("\n")[2].trim().split(" ")[1];

	if (process.env.NODE_ENV === "development") {
		if (text.length === 1 && typeof text[0] === "string") {
			console.log(`${timeString} (${caller}) - ${text}`);
		} else {
			console.log(`${timeString} (${caller}`, text);
		}
	}
}

/**
 * Send logs to the configured Discord channel
 * @param guildID - Guild identifier
 * @param bot - Discord client
 * @param text - Log messages to send
 */
export async function discordLogs(guildID: string, bot: Client, ...text: unknown[]) {
	if (!getConfig(CommandName.log, guildID)) {
		return;
	}

	const channelId = getConfig(CommandName.log, guildID, true);
	if (!channelId || typeof channelId !== "string") {
		return;
	}

	try {
		const channel = await bot.channels.fetch(channelId);
		if (channel && "send" in channel && typeof channel.send === "function") {
			await channel.send(`\`\`\`\n${text.join(" ")}\n\`\`\``);
		}
	} catch (error) {
		console.error("Failed to send log message:", error);
	}
}

/**
 * Convert first character to uppercase
 * @param name - String to convert
 * @returns String with first character capitalized
 */
export function toTitle(name: string) {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Update guild cache by fetching members and roles
 * @param guild - Guild to update
 */
export async function updateCache(guild: Guild) {
	try {
		await Promise.all([guild.members.fetch(), guild.roles.fetch()]);
	} catch (e) {
		console.log(e);
		// Ignore error
	}
}

/**
 * Fetch all archived threads from a guild
 * @param guild - Guild to fetch archived threads from
 * @returns Array of archived threads
 */
export async function fetchArchived(guild: Guild) {
	const textChannels = guild.channels.cache.filter(
		(c) => c.type === ChannelType.GuildText
	);
	const results = await Promise.allSettled(
		textChannels.map((channel) => channel.threads.fetchArchived({ fetchAll: true }))
	);

	// Collect all accessible threads, ignoring individual errors
	return results
		.filter((result) => result.status === "fulfilled")
		.flatMap((result) => {
			if (result.status === "fulfilled") {
				return Array.from(result.value.threads.values());
			}
			return [];
		});
}

export async function getCommandId(commandName: string, guild: Guild) {
	const cmdsId = await guild.commands.fetch();
	const command = cmdsId.find((cmd) => cmd.name === commandName);
	return command?.id;
}
