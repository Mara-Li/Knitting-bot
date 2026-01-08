import {
	ChannelType,
	type Client,
	DMChannel,
	type ForumChannel,
	type NonThreadGuildBasedChannel,
	type TextChannel,
} from "discord.js";
import {
	deleteCachedMessage,
	getMaps,
	getRoleIn,
	setRoleIn,
	setTrackedItem,
} from "../../maps";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for channel delete event.
 * It will delete the channel from the database.
 */

export default (client: Client): void => {
	client.on("channelDelete", async (channel) => {
		if (channel instanceof DMChannel) return;
		const guildID = channel.guild.id;
		const channelGuild = channel as NonThreadGuildBasedChannel;
		const channelType = channelGuild.type;

		const ignoredRoleIns = getRoleIn("ignore", guildID);
		const followedRoleIns = getRoleIn("follow", guildID);

		const ignoredRoleIn = ignoredRoleIns.some((ignored) => {
			return ignored.channelIds.includes(channel.id);
		});
		const followedRoleIn = followedRoleIns.some((followed) => {
			return followed.channelIds.includes(channel.id);
		});

		if (ignoredRoleIn) {
			const updated = ignoredRoleIns.map((roleIn) => ({
				...roleIn,
				channelIds: roleIn.channelIds.filter((id) => id !== channel.id),
			}));
			setRoleIn("ignore", guildID, updated);
		}

		if (followedRoleIn) {
			const updated = followedRoleIns.map((roleIn) => ({
				...roleIn,
				channelIds: roleIn.channelIds.filter((id) => id !== channel.id),
			}));
			setRoleIn("follow", guildID, updated);
		}

		if (channelType === ChannelType.GuildText) {
			/**
			 * Clean up message cache for all threads in this text channel
			 */
			const textChannel = channelGuild as TextChannel;
			const threads = textChannel.threads.cache;
			threads.forEach((thread) => {
				deleteCachedMessage(guildID, thread.id);
			});

			/**
			 * Remove the channel ID from the database "follow" and "ignore" maps
			 */
			const allIgnore = getMaps("ignore", "channel", guildID);
			const allFollow = getMaps("follow", "channel", guildID);

			const filteredIgnore = allIgnore.filter((id) => id !== channel.id);
			const filteredFollow = allFollow.filter((id) => id !== channel.id);

			if (allIgnore.length !== filteredIgnore.length) {
				setTrackedItem("ignore", "channel", guildID, filteredIgnore);
			}
			if (allFollow.length !== filteredFollow.length) {
				setTrackedItem("follow", "channel", guildID, filteredFollow);
			}
		} else if (channelType === ChannelType.GuildCategory) {
			/**
			 * Remove the category ID from the database "follow" and "ignore" maps
			 */
			const allCategoryIgnore = getMaps("ignore", "category", guildID);
			const allCategoryFollow = getMaps("follow", "category", guildID);

			const filteredIgnore = allCategoryIgnore.filter((id) => id !== channel.id);
			const filteredFollow = allCategoryFollow.filter((id) => id !== channel.id);

			if (allCategoryIgnore.length !== filteredIgnore.length) {
				setTrackedItem("ignore", "category", guildID, filteredIgnore);
			}
			if (allCategoryFollow.length !== filteredFollow.length) {
				setTrackedItem("follow", "category", guildID, filteredFollow);
			}
		} else if (channelType === ChannelType.GuildForum) {
			/**
			 * Clean up message cache for all threads in this forum
			 */
			const forum = channelGuild as ForumChannel;
			forum.threads.cache.forEach((thread) => {
				deleteCachedMessage(guildID, thread.id);
			});

			/**
			 * Remove the forum ID from the database "follow" and "ignore" maps
			 */
			const allThreadIgnore = getMaps("ignore", "forum", guildID);
			const allThreadFollow = getMaps("follow", "forum", guildID);

			const filteredIgnore = allThreadIgnore.filter((id) => id !== channel.id);
			const filteredFollow = allThreadFollow.filter((id) => id !== channel.id);

			if (allThreadIgnore.length !== filteredIgnore.length) {
				setTrackedItem("ignore", "forum", guildID, filteredIgnore);
			}
			if (allThreadFollow.length !== filteredFollow.length) {
				setTrackedItem("follow", "forum", guildID, filteredFollow);
			}
		}
	});
};
