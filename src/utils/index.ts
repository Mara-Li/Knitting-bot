import process from "node:process";
import type {
	Client,
	CommandInteraction,
	Guild,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import i18next from "i18next";
import { resources } from "../i18n/init";
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

export function messageOfBot(thread: ThreadChannel, bot: Client) {
	return thread.messages.cache.find(
		(message) => message.author.id === bot.user?.id,
	);
}

export async function discordLogs(
	guildID: string,
	bot: Client,
	...text: unknown[]
) {
	if (getConfig(CommandName.log, guildID)) {
		const chan = getConfig(CommandName.log, guildID, true) as string;
		if (chan) {
			//search channel in guild
			const channel = await bot.channels.fetch(chan);
			if (channel) {
				const channelText = channel as TextChannel;
				await channelText.send(`\`\`\`\n${text.join(" ")}\n\`\`\``);
			}
		}
	}
}

export function changeLanguage(interaction: CommandInteraction) {
	const lang = interaction.locale as keyof typeof resources;
	const userLang = resources[lang] ? lang : "en";
	i18next.changeLanguage(userLang);
}

export function changeGuildLanguage(guild: Guild) {
	if (guild.preferredLocale === null) return "en";
	if (guild.preferredLocale.includes("en")) {
		i18next.changeLanguage("en");
		return;
	}
	const lang = guild.preferredLocale as keyof typeof resources;
	const userLang = resources[lang] ? lang : "en";
	i18next.changeLanguage(userLang);
	return;
}
