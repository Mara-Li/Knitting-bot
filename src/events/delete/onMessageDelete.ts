import { type Client, MessageFlags, type ThreadChannel } from "discord.js";
import { EMOJI } from "../../index";
import {
	deleteCachedMessage,
	getCachedMessage,
	getMessageToSend,
	getPinSetting,
	setCachedMessage,
} from "../../maps";

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

		// If this deleted message was our cached message, recreate it
		if (cachedMessageId === message.id) {
			deleteCachedMessage(guildId, threadId);

			try {
				const thread = message.channel as ThreadChannel;
				const messageToSend = getMessageToSend(guildId) || EMOJI;
				const shouldPin = getPinSetting(guildId);

				// Recreate the bot message
				const newMessage = await thread.send({
					content: messageToSend,
					flags: MessageFlags.SuppressNotifications,
				});

				if (shouldPin) await newMessage.pin();

				// Update cache with new message
				setCachedMessage(guildId, threadId, newMessage.id);
			} catch (error) {
				console.error(`Failed to recreate bot message in thread ${threadId}:`, error);
			}
		}
	});
};
