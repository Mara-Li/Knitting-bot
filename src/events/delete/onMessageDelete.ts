import { type Client, MessageFlags, type ThreadChannel } from "discord.js";
import { getTranslation, ln } from "../../i18n";
import { EMOJI } from "../../index";
import {
	deleteCachedMessage,
	getCachedMessage,
	getConfig,
	getMessageToSend,
	getPinSetting,
	setCachedMessage,
} from "../../maps";
import { discordLogs } from "../../utils";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description Clean up message cache and recreate bot message when deleted
 */
export default (client: Client): void => {
	client.on("messageDelete", async (message) => {
		if (!message.author || message.author.id !== client.user?.id) return;
		if (!message.channel.isThread()) return;
		if (!message.guild) return;

		const guildId = message.guild.id;
		const threadId = message.channel.id;
		const cachedMessageId = getCachedMessage(guildId, threadId);
		// If this deleted message was our cached message, warn the admins
		if (cachedMessageId === message.id) {
			deleteCachedMessage(guildId, threadId);
			const ul = getTranslation(guildId, { locale: message.guild.preferredLocale });
			await discordLogs(
				guildId,
				client,
				ul("error.deletedBotMessage", { bot: client.user.id, thread: threadId })
			);
		}
	});
};
