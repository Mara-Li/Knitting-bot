import {
	ChannelType,
	type Client,
	DMChannel,
	type ForumChannel,
	type NonThreadGuildBasedChannel,
	type TextChannel,
} from "discord.js";
import { TypeName } from "../../interface";
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

		// Check if channel is in any RoleIn configuration
		const ignoredRoleIn = getRoleIn("ignore", guildID).some((ignored) => {
			return ignored.channelIds.includes(channel.id);
		});
		const followedRoleIn = getRoleIn("follow", guildID).some((followed) => {
			return followed.channelIds.includes(channel.id);
		});

		// Remove channel from RoleIn configurations
		if (ignoredRoleIn) {
			const ignored = getRoleIn("ignore", guildID);
			const updated = ignored.map((roleIn) => ({
				...roleIn,
				channelIds: roleIn.channelIds.filter((id) => id !== channel.id),
			}));
			setRoleIn("ignore", guildID, updated);
		}

		if (followedRoleIn) {
			const followed = getRoleIn("follow", guildID);
			const updated = followed.map((roleIn) => ({
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
			const allIgnore = getMaps("ignore", TypeName.channel, guildID);
			const allFollow = getMaps("follow", TypeName.channel, guildID);

			const filteredIgnore = allIgnore.filter((id) => id !== channel.id);
			const filteredFollow = allFollow.filter((id) => id !== channel.id);

			if (allIgnore.length !== filteredIgnore.length) {
				setTrackedItem("ignore", TypeName.channel, guildID, filteredIgnore);
			}
			if (allFollow.length !== filteredFollow.length) {
				setTrackedItem("follow", TypeName.channel, guildID, filteredFollow);
			}
		} else if (channelType === ChannelType.GuildCategory) {
			/**
			 * Remove the category ID from the database "follow" and "ignore" maps
			 */
			const allCategoryIgnore = getMaps("ignore", TypeName.category, guildID);
			const allCategoryFollow = getMaps("follow", TypeName.category, guildID);

			const filteredIgnore = allCategoryIgnore.filter((id) => id !== channel.id);
			const filteredFollow = allCategoryFollow.filter((id) => id !== channel.id);

			if (allCategoryIgnore.length !== filteredIgnore.length) {
				setTrackedItem("ignore", TypeName.category, guildID, filteredIgnore);
			}
			if (allCategoryFollow.length !== filteredFollow.length) {
				setTrackedItem("follow", TypeName.category, guildID, filteredFollow);
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
			const allThreadIgnore = getMaps("ignore", TypeName.forum, guildID);
			const allThreadFollow = getMaps("follow", TypeName.forum, guildID);

			const filteredIgnore = allThreadIgnore.filter((id) => id !== channel.id);
			const filteredFollow = allThreadFollow.filter((id) => id !== channel.id);

			if (allThreadIgnore.length !== filteredIgnore.length) {
				setTrackedItem("ignore", TypeName.forum, guildID, filteredIgnore);
			}
			if (allThreadFollow.length !== filteredFollow.length) {
				setTrackedItem("follow", TypeName.forum, guildID, filteredFollow);
			}
		}
	});
};
