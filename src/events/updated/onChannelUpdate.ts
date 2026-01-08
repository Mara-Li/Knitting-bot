import { ChannelType, type Client, type TextChannel } from "discord.js";
import { getTranslation } from "../../i18n";
import { getConfig } from "../../maps";
import { discordLogs, updateThread } from "../../utils";
import { validateChannelType } from "../../utils/data_check";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for channel update event.
 * When the permission of a channel is updated, check if the channel have thread and update them.
 */

export default (client: Client): void => {
	client.on("channelUpdate", async (oldChannel, newChannel) => {
		if (
			oldChannel.type === ChannelType.DM ||
			newChannel.type === ChannelType.DM ||
			!oldChannel.guild
		)
			return;
		const guild = oldChannel.guild.id;

		const ul = getTranslation(guild, {
			locale: newChannel.guild.preferredLocale,
		});
		if (!getConfig("onChannelUpdate", guild)) return;
		if (
			!validateChannelType(oldChannel) ||
			!validateChannelType(newChannel) ||
			oldChannel.permissionOverwrites.cache === newChannel.permissionOverwrites.cache
		) {
			return;
		}

		const followOnlyChannelEnabled = getConfig("followOnlyChannel", guild);
		const isCategory = newChannel.type === ChannelType.GuildCategory;

		if (isCategory) {
			//get all threads of the channels in the category
			const children = newChannel.children.cache;
			if (children.size === 0) return;

			for (const child of children.values()) {
				if (child.type === ChannelType.GuildText) {
					const threads = (child as TextChannel).threads.cache;
					if (threads.size > 0)
					await Promise.all(
						threads.map(async (thread) => {
							await updateThread(followOnlyChannelEnabled, thread);
						})
					);
				}
			}
		} else {
			const newTextChannel = newChannel as TextChannel;
			const threads = newTextChannel.threads.cache;
			if (threads.size === 0) return;
			await Promise.all(
				threads.map(async (thread) => {
					await updateThread(followOnlyChannelEnabled, thread);
				})
			);
		}
	});
};
