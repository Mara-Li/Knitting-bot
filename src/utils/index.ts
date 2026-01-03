import process from "node:process";
import type { Client, Guild, TextChannel } from "discord.js";
import { CommandName } from "../interface";
import { getConfig } from "../maps";

export function logInDev(...text: unknown[]) {
	const time = new Date();
	const timeString = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
	/** get the called function name */
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

export async function discordLogs(guildID: string, bot: Client, ...text: unknown[]) {
	if (getConfig(CommandName.log, guildID)) {
		const chan = getConfig(CommandName.log, guildID, true);
		if (chan && typeof chan === "string") {
			//search channel in guild
			const channel = await bot.channels.fetch(chan);
			if (channel) {
				const channelText = channel as TextChannel;
				await channelText.send(`\`\`\`\n${text.join(" ")}\n\`\`\``);
			}
		}
	}
}

export function toTitle(name: string) {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function updateCache(guild: Guild) {
	try {
		await guild.members.fetch();
		await guild.roles.fetch();
	} catch (e) {
		console.log(e);
		//ignore error
	}
}
