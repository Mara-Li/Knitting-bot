import type { Client } from "discord.js";
import db from "../../database";
import { getTranslation } from "../../i18n";
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
		const cachedMessageId = db.settings.get(guildId, `messageCache.${threadId}`);
		// If this deleted message was our cached message, warn the admins
		if (cachedMessageId === message.id) {
			db.settings.delete(guildId, `messageCache.${threadId}`);
			const ul = getTranslation(guildId, { locale: message.guild.preferredLocale });
			await discordLogs(
				guildId,
				client,
				false,
				ul("error.deletedBotMessage", { bot: client.user.id, thread: threadId })
			);
		}
		//also delete any pagination state linked to this message
		db.messageToStateKey.delete(message.id);
	});
};
