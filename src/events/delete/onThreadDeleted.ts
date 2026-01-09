import type { Client } from "discord.js";
import db from "../../database";

export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		console.info(`Thread deleted: ${thread.id}`);
		const guildID = thread.guild.id;

		// Clean up message cache for this thread
		db.settings.delete(guildID, `messageCache.${thread.id}`);
		// Remove from thread ID lists
		const followedThreads = db.getMaps("follow", "thread", guildID);
		const ignoredThreads = db.getMaps("ignore", "thread", guildID);

		const filteredFollowed = followedThreads.filter((id) => id !== thread.id);
		const filteredIgnored = ignoredThreads.filter((id) => id !== thread.id);

		if (followedThreads.length !== filteredFollowed.length) {
			db.setTrackedItem("follow", "thread", guildID, filteredFollowed);
		}
		if (ignoredThreads.length !== filteredIgnored.length) {
			db.setTrackedItem("ignore", "thread", guildID, filteredIgnored);
		}

		// Remove from RoleIn channel ID lists
		const followedRoleIns = db.settings.get(guildID, "follow.onlyRoleIn") ?? [];
		const ignoredRoleIns = db.settings.get(guildID, "ignore.onlyRoleIn") ?? [];

		const updatedFollowedRoleIns = followedRoleIns
			.map((roleIn) => ({
				...roleIn,
				channelIds: roleIn.channelIds.filter((id) => id !== thread.id),
			}))
			.filter((roleIn) => roleIn.channelIds.length > 0);
		const updatedIgnoredRoleIns = ignoredRoleIns
			.map((roleIn) => ({
				...roleIn,
				channelIds: roleIn.channelIds.filter((id) => id !== thread.id),
			}))
			.filter((roleIn) => roleIn.channelIds.length > 0);

		if (
			followedRoleIns.length !== updatedFollowedRoleIns.length ||
			followedRoleIns.some(
				(roleIn, index) =>
					updatedFollowedRoleIns[index] &&
					roleIn.channelIds.length !== updatedFollowedRoleIns[index].channelIds.length
			)
		) {
			db.settings.set(guildID, updatedFollowedRoleIns, "follow.onlyRoleIn");
		}
		if (
			ignoredRoleIns.length !== updatedIgnoredRoleIns.length ||
			ignoredRoleIns.some(
				(roleIn, index) =>
					updatedIgnoredRoleIns[index] &&
					roleIn.channelIds.length !== updatedIgnoredRoleIns[index].channelIds.length
			)
		) {
			db.settings.set(guildID, updatedIgnoredRoleIns, "ignore.onlyRoleIn");
		}
	});
};
