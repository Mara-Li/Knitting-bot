import {
	ChannelType,
	type Client,
	DMChannel,
	type ForumChannel,
	type NonThreadGuildBasedChannel,
	type TextChannel,
} from "discord.js";
import db from "../../database.js";
import type { RoleIn } from "../../interfaces";

function filterRoleInsByChannel(roleIns: RoleIn[], channelId: string) {
	return roleIns
		.map((roleIn) => {
			if (!roleIn.channelIds.includes(channelId)) return roleIn;
			return {
				...roleIn,
				channelIds: roleIn.channelIds.filter((id) => id !== channelId),
			};
		})
		.filter((roleIn) => roleIn.channelIds.length > 0);
}

function cleanupChannelFromMaps(
	channelId: string,
	typeName: "channel" | "category" | "forum",
	guildID: string
) {
	const allIgnore = db.getMaps("ignore", typeName, guildID);
	const allFollow = db.getMaps("follow", typeName, guildID);

	const filteredIgnore = allIgnore.filter((id) => id !== channelId);
	const filteredFollow = allFollow.filter((id) => id !== channelId);

	if (allIgnore.length !== filteredIgnore.length) {
		db.setTrackedItem("ignore", typeName, guildID, filteredIgnore);
	}
	if (allFollow.length !== filteredFollow.length) {
		db.setTrackedItem("follow", typeName, guildID, filteredFollow);
	}
}
/**
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

		const ignoredRoleIns = db.settings.get(guildID, "ignore.OnlyRoleIn") ?? [];
		const followedRoleIns = db.settings.get(guildID, "follow.OnlyRoleIn") ?? [];

		const hasIgnoredRoleIn = ignoredRoleIns.some((ignored) => {
			return ignored.channelIds.includes(channel.id);
		});
		const hasFollowedRoleIn = followedRoleIns.some((followed) => {
			return followed.channelIds.includes(channel.id);
		});

		if (hasIgnoredRoleIn) {
			const updated = filterRoleInsByChannel(ignoredRoleIns, channel.id);
			//setRoleIn("ignore", guildID, updated);
			db.settings.set(guildID, updated, "ignore.OnlyRoleIn");
		}

		if (hasFollowedRoleIn) {
			const updated = filterRoleInsByChannel(followedRoleIns, channel.id);
			//setRoleIn("follow", guildID, updated);
			db.settings.set(guildID, updated, "follow.OnlyRoleIn");
		}

		if (channelType === ChannelType.GuildText) {
			/**
			 * Clean up message cache for all threads in this text channel
			 */
			const textChannel = channelGuild as TextChannel;
			//use cache as fetchActive can't works for deleted channels
			const threads = textChannel.threads.cache;
			threads.forEach((thread) => {
				//deleteCachedMessage(guildID, thread.id);
				db.settings.delete(guildID, `messageCache.${thread.id}`);
			});

			/**
			 * Remove the channel ID from the database "follow" and "ignore" maps
			 */
			cleanupChannelFromMaps(channel.id, "channel", guildID);
		} else if (channelType === ChannelType.GuildCategory) {
			/**
			 * Remove the category ID from the database "follow" and "ignore" maps
			 */
			cleanupChannelFromMaps(channel.id, "category", guildID);
		} else if (channelType === ChannelType.GuildForum) {
			/**
			 * Clean up message cache for all threads in this forum
			 */
			const forum = channelGuild as ForumChannel;
			forum.threads.cache.forEach((thread) => {
				db.settings.delete(guildID, `messageCache.${thread.id}`);
			});

			/**
			 * Remove the forum ID from the database "follow" and "ignore" maps
			 */
			cleanupChannelFromMaps(channel.id, "forum", guildID);
		}
	});
};
