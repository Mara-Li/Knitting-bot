import { Client, ThreadChannel } from "discord.js";
import process from "process";

export function logInDev(...text: unknown[]) {
	const time= new Date();
	const timeString = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
	if (process.env.NODE_ENV === "development") {
		if (text.length === 1) {
			console.log(`${timeString} - ${text}`);
		} else {
			console.log(timeString, text);
		}
	}
}

export function messageOfBot(thread: ThreadChannel, bot: Client) {
	return thread.messages.cache.find((message) => message.author.id === bot.user?.id);
}
