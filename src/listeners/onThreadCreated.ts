import { ChannelType, Client, ThreadChannel } from "discord.js";
import { CommandName, get } from "../maps";
import { addRoleAndUserToThread, checkIfThreadIsIgnored, logInDev } from "../utils";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for the threadCreate event.
 * It will add all users that have the permission to view the thread.
 */
export default (client: Client): void => {
	client.on("threadCreate", async (thread: ThreadChannel) => {
		//return if the thread is not a public thread
		if (thread.type !== ChannelType.PublicThread) return;
		if (get(CommandName.thread) === false) return;
		logInDev(`Thread ${thread.name} created!`);
		if (checkIfThreadIsIgnored(thread)) return;
		await addRoleAndUserToThread(thread);
	});
};
