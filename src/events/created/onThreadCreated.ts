import { ChannelType, type Client, type ThreadChannel } from "discord.js";
import db from "../../database.js";
import { getTranslation } from "../../i18n";
import { discordLogs, updateCache } from "../../utils";
import { addRoleAndUserToThread } from "../../utils/add";
import { checkThread } from "../../utils/data_check";
/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for the threadCreate event.
 * It will add all users that have the permission to view the thread.
 */
export default (client: Client): void => {
	client.on("threadCreate", async (thread: ThreadChannel) => {
		//return if the thread is not a public thread
		const guild = thread.guild.id;
		if (thread.type !== ChannelType.PublicThread) return;
		if (!db.settings.get(guild, "configuration.onThreadCreated")) return;
		const ul = getTranslation(thread.guild.id, { locale: thread.guild.preferredLocale });
		await discordLogs(guild, client, ul("logs.thread.created", { thread: thread.name }));
		/** automatically add the bot to the thread */
		try {
			await thread.join();
		} catch (error) {
			await discordLogs(
				guild,
				client,
				ul("logs.thread.join_error", { error: String(error), thread: thread.name })
			);
			return;
		}
		/**
		 * Update the cache
		 */
		await updateCache(thread.guild);
		if (!db.settings.get(guild, "configuration.followOnlyChannel")) {
			if (!checkThread(thread, "ignore")) await addRoleAndUserToThread(thread);
		} else {
			if (checkThread(thread, "follow")) await addRoleAndUserToThread(thread);
		}
	});
};
