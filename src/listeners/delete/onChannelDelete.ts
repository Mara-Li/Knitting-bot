import { ChannelType, Client, DMChannel, NonThreadGuildBasedChannel } from "discord.js";
import { getIgnored, setIgnore, TypeName } from "../../maps";
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
		const channelGuild = channel as NonThreadGuildBasedChannel ;
		const channelType = channelGuild.type;
		if (channelType === ChannelType.GuildText) {
			/**
			 * Remove the channel from the database "follow" and "ignore" maps
			 */
			const allIgnore = getIgnored(TypeName.channel);
			const allFollow = getIgnored(TypeName.channel);
			const isIgnored = allIgnore.some((ignored) => ignored.id === channel.id);
			const isFollowed = allFollow.some((followed) => followed.id === channel.id);
			if (isIgnored) {
				const index = allIgnore.findIndex((ignored) => ignored.id === channel.id);
				allIgnore.splice(index, 1);
				setIgnore(TypeName.channel, allIgnore);
				logInDev(`Channel ${channel.name} removed from ignore list`);
			}
			if (isFollowed) {
				const index = allFollow.findIndex((followed) => followed.id === channel.id);
				allFollow.splice(index, 1);
				setIgnore(TypeName.channel, allFollow);
				logInDev(`Channel ${channel.name} removed from follow list`);
			}
		} else if (channelType === ChannelType.GuildCategory) {
			/**
			 * Remove the category from the database "follow" and "ignore" maps
			 */
			const allCategoryIgnore = getIgnored(TypeName.category);
			const allCategoryFollow = getIgnored(TypeName.category);
			const isCategoryIgnored = allCategoryIgnore.some((ignored) => ignored.id === channel.id);
			const isCategoryFollowed = allCategoryFollow.some((followed) => followed.id === channel.id);
			if (isCategoryIgnored) {
				const index = allCategoryIgnore.findIndex((ignored) => ignored.id === channel.id);
				allCategoryIgnore.splice(index, 1);
				setIgnore(TypeName.category, allCategoryIgnore);
				logInDev(`Category ${channel.name} removed from ignore list`);
			}
			if (isCategoryFollowed) {
				const index = allCategoryFollow.findIndex((followed) => followed.id === channel.id);
				allCategoryFollow.splice(index, 1);
				setIgnore(TypeName.category, allCategoryFollow);
				logInDev(`Category ${channel.name} removed from follow list`);
			}
		} else if (channelType === ChannelType.GuildNews) {
			/**
			 * Remove the forum from the database "follow" and "ignore" maps
			 */
			const allThreadIgnore = getIgnored(TypeName.forum);
			const allThreadFollow = getIgnored(TypeName.forum);
			const isForumIgnored = allThreadIgnore.some((ignored) => ignored.id === channel.id);
			const isForumFollowed = allThreadFollow.some((followed) => followed.id === channel.id);
			if (isForumIgnored) {
				const index = allThreadIgnore.findIndex((ignored) => ignored.id === channel.id);
				allThreadIgnore.splice(index, 1);
				setIgnore(TypeName.forum, allThreadIgnore);
				logInDev(`Forum ${channel.name} removed from ignore list`);
			}
			if (isForumFollowed) {
				const index = allThreadFollow.findIndex((followed) => followed.id === channel.id);
				allThreadFollow.splice(index, 1);
				setIgnore(TypeName.forum, allThreadFollow);
				logInDev(`Forum ${channel.name} removed from follow list`);
			}
		}
	});
};
