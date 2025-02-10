import { ChannelType, type Client, type ThreadChannel } from "discord.js";
import i18next from "i18next";
import { CommandName } from "../../interface";
import { getConfig } from "../../maps";
import { changeGuildLanguage, discordLogs, logInDev } from "../../utils";
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
		if (getConfig(CommandName.thread, guild) === false) return;
		logInDev(`Thread ${thread.name} created!`);
		changeGuildLanguage(thread.guild);
		await discordLogs(
			guild,
			client,
			i18next.t("logs.thread.created", { thread: thread.name }),
		);
		/** automatically add the bot to the thread */
		await thread.join();
		if (!getConfig(CommandName.followOnlyChannel, guild)) {
			logInDev("Thread is not follow only", !checkThread(thread, "ignore"));
			if (!checkThread(thread, "ignore")) await addRoleAndUserToThread(thread);
		} else {
			logInDev("Thread is follow only", checkThread(thread, "follow"));
			if (checkThread(thread, "follow")) await addRoleAndUserToThread(thread);
		}
	});
};
