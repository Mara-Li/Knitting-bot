import {
	CategoryChannel,
	ChannelType,
	Client,
	DMChannel,
	ForumChannel,
	NonThreadGuildBasedChannel,
	TextChannel,
} from "discord.js";
import { TypeName } from "../../interface";
import { getMaps, getRoleIn, setIgnore, setRoleIn } from "../../maps";
import { logInDev } from "../../utils";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for channel delete event.
 * It will delete the channel from the database.
 */

export default (client: Client): void => {
	client.on("channelDelete", async (
		channel) => {
		if (channel instanceof DMChannel) return;
		const guildID = channel.guild.id;
		const channelGuild = channel as NonThreadGuildBasedChannel ;
		const channelType = channelGuild.type;
		const ignoredRoleIn = getRoleIn("ignore", guildID).some((ignored) => {
			const channels = ignored.channels;
			return channels.some((ignored) => channel.id === ignored.id);
		});
		const followedRoleIn = getRoleIn("follow", guildID).some((followed) => {
			const channels = followed.channels;
			return channels.some((followed) => channel.id === followed.id);
		});
		if (ignoredRoleIn) {
			//remove the channel from the role.channels array
			const ignored = getRoleIn("ignore", guildID);
			ignored.forEach((ignored) => {
				const channels = ignored.channels;
				const index = channels.findIndex((channel) => channel.id === channel.id);
				channels.splice(index, 1);
				ignored.channels = channels;
			});
			setRoleIn("ignore",guildID, ignored);
		} if (followedRoleIn) {
			//remove the channel from the role.channels array
			const followed = getRoleIn("follow", guildID);
			followed.forEach((followed) => {
				const channels = followed.channels;
				const index = channels.findIndex((channel) => channel.id === channel.id);
				channels.splice(index, 1);
				followed.channels = channels;
			});
			setRoleIn("follow",guildID, followed);
		}
		if (channelType === ChannelType.GuildText) {
			/**
			 * Remove the channel from the database "follow" and "ignore" maps
			 */
			const allIgnore = getMaps("ignore",TypeName.channel, guildID) as TextChannel[];
			const allFollow = getMaps("follow",TypeName.channel, guildID) as TextChannel[];
			const isIgnored = allIgnore.some((ignored) => ignored.id === channel.id);
			const isFollowed = allFollow.some((followed) => followed.id === channel.id);
			if (isIgnored) {
				const index = allIgnore.findIndex((ignored) => ignored.id === channel.id);
				allIgnore.splice(index, 1);
				setIgnore(TypeName.channel, guildID, allIgnore as TextChannel[]);
			}
			if (isFollowed) {
				const index = allFollow.findIndex((followed) => followed.id === channel.id);
				allFollow.splice(index, 1);
				setIgnore(TypeName.channel, guildID, allFollow);
			}
		} else if (channelType === ChannelType.GuildCategory) {
			/**
			 * Remove the category from the database "follow" and "ignore" maps
			 */
			const allCategoryIgnore = getMaps("ignore",TypeName.category, guildID) as CategoryChannel[];
			const allCategoryFollow = getMaps("follow",TypeName.category, guildID) as CategoryChannel[];
			const isCategoryIgnored = allCategoryIgnore.some((ignored) => ignored.id === channel.id);
			const isCategoryFollowed = allCategoryFollow.some((followed) => followed.id === channel.id);
			if (isCategoryIgnored) {
				const index = allCategoryIgnore.findIndex((ignored) => ignored.id === channel.id);
				allCategoryIgnore.splice(index, 1);
				setIgnore(TypeName.category, guildID, allCategoryIgnore);
			}
			if (isCategoryFollowed) {
				const index = allCategoryFollow.findIndex((followed) => followed.id === channel.id);
				allCategoryFollow.splice(index, 1);
				setIgnore(TypeName.category,guildID, allCategoryFollow);
			}
		} else if (channelType === ChannelType.GuildForum) {
			/**
			 * Remove the forum from the database "follow" and "ignore" maps
			 */
			const allThreadIgnore = getMaps("ignore",TypeName.forum,guildID) as ForumChannel[];
			const allThreadFollow = getMaps("follow",TypeName.forum, guildID) as ForumChannel[];
			const isForumIgnored = allThreadIgnore.some((ignored) => ignored.id === channel.id);
			const isForumFollowed = allThreadFollow.some((followed) => followed.id === channel.id);
			if (isForumIgnored) {
				const index = allThreadIgnore.findIndex((ignored) => ignored.id === channel.id);
				allThreadIgnore.splice(index, 1);
				setIgnore(TypeName.forum, guildID, allThreadIgnore);
			}
			if (isForumFollowed) {
				const index = allThreadFollow.findIndex((followed) => followed.id === channel.id);
				allThreadFollow.splice(index, 1);
				setIgnore(TypeName.forum, guildID, allThreadFollow);
			}
		}
	});
};
