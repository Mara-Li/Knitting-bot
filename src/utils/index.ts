import process from "node:process";
import type {
	Client,
	Collection,
	CommandInteraction,
	Guild,
	Message,
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
	return thread.messages.cache.find((message) => message.author.id === bot.user?.id);
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

export function toTitle(name: string) {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

export function findFirst(
	thread: ThreadChannel,
	fetchedMessage: Collection<string, Message<true>>
) {
	return fetchedMessage.filter((m) => m.author.id === thread.client.user.id).first();
}

export async function fetchMessage(thread: ThreadChannel) {
	const fetchedMessage = thread.messages.cache;
	const msg = findFirst(thread, fetchedMessage);
	if (msg) return msg;
	const fetched = await thread.messages.fetch();
	return findFirst(thread, fetched);
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
