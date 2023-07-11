import { Client, ThreadChannel } from "discord.js";
import process from "process";

export function logInDev(...text: unknown[]) {
	const time= new Date();
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
