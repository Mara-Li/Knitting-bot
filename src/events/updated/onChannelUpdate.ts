import { ChannelType, type Client, type Snowflake, type TextChannel } from "discord.js";
import { getTranslation } from "../../i18n";
import { CommandName } from "../../interface";
import { getConfig } from "../../maps";
import { discordLogs, logInDev, updateCache } from "../../utils";
import { addRoleAndUserToThread } from "../../utils/add";
import { checkThread, validateChannelType } from "../../utils/data_check";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for channel update event.
 * When the permission of a channel is updated, check if the channel have thread and update them.
 */

export default (client: Client): void => {
	client.on("channelUpdate", async (oldChannel, newChannel) => {
		logInDev(`Channel ${getChannelName(oldChannel.id, client)} has been updated.`);
		if (
			oldChannel.type === ChannelType.DM ||
			newChannel.type === ChannelType.DM ||
			!oldChannel.guild
		)
			return;
		const guild = oldChannel.guild.id;
		await updateCache(oldChannel.guild);
		const ul = getTranslation(guild, {
			locale: newChannel.guild.preferredLocale,
		});
		if (!getConfig(CommandName.channel, guild)) return;
		if (
			!validateChannelType(oldChannel) ||
			!validateChannelType(newChannel) ||
			oldChannel.permissionOverwrites.cache === newChannel.permissionOverwrites.cache
		) {
			return;
		}

		const followOnlyChannelEnabled = getConfig(CommandName.followOnlyChannel, guild);
		const isCategory = newChannel.type === ChannelType.GuildCategory;

		if (isCategory) {
			//get all threads of the channels in the category
			const children = newChannel.children.cache;
			if (children.size === 0) return;

			for (const child of children.values()) {
				if (child.type === ChannelType.GuildText) {
					const threads = (child as TextChannel).threads.cache;
					if (threads.size > 0)
						await discordLogs(
							guild,
							client,
							ul("logs.updated.channel", {
								child: child.name,
								number: threads.size,
							})
						);

					for (const thread of threads.values()) {
						const shouldUpdate = followOnlyChannelEnabled
							? checkThread(thread, "follow")
							: !checkThread(thread, "ignore");

						if (shouldUpdate) {
							await addRoleAndUserToThread(thread);
							// Add delay between requests to avoid gateway rate limit
							await new Promise((resolve) => setTimeout(resolve, 250));
						}
					}
				}
			}
		} else {
			const newTextChannel = newChannel as TextChannel;
			const threads = newTextChannel.threads.cache;
			if (threads.size === 0) return;

			await discordLogs(
				guild,
				client,
				ul("logs.updated.channel", {
					child: newTextChannel.name,
					number: threads.size,
				})
			);

			for (const thread of threads.values()) {
				const shouldUpdate = followOnlyChannelEnabled
					? checkThread(thread, "follow")
					: !checkThread(thread, "ignore");

				if (shouldUpdate) {
					await addRoleAndUserToThread(thread);
					// Add delay between requests to avoid gateway rate limit
					await new Promise((resolve) => setTimeout(resolve, 250));
				}
			}
		}
	});
};

/**
 * @description Get the name of a channel
 * @param channelID {Snowflake} - The ID of the channel
 * @param Client {Client} - The Discord.js Client
 */
function getChannelName(channelID: Snowflake, Client: Client) {
	const channel = Client.channels.cache.get(channelID);
	//check if the channel is a text channel
	if (!channel || channel.type !== ChannelType.GuildText) return channelID;
	return (channel as TextChannel).name;
}
