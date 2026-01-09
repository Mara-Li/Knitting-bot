import type { Client } from "discord.js";
import db from "../../database.js";

export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		console.info(`Thread deleted: ${thread.id}`);
		const guildID = thread.guild.id;

		// Clean up message cache for this thread
		//deleteCachedMessage(guildID, thread.id);
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

		const updatedFollowedRoleIns = followedRoleIns.map((roleIn) => ({
			...roleIn,
			channelIds: roleIn.channelIds.filter((id) => id !== thread.id),
		}));
		const updatedIgnoredRoleIns = ignoredRoleIns.map((roleIn) => ({
			...roleIn,
			channelIds: roleIn.channelIds.filter((id) => id !== thread.id),
		}));

		if (
			followedRoleIns.some(
				(roleIn, index) =>
					roleIn.channelIds.length !== updatedFollowedRoleIns[index].channelIds.length
			)
		) {
			//setRoleIn("follow", guildID, updatedFollowedRoleIns);
			db.settings.set(guildID, updatedFollowedRoleIns, "follow.onlyRoleIn");
		}
		if (
			ignoredRoleIns.some(
				(roleIn, index) =>
					roleIn.channelIds.length !== updatedIgnoredRoleIns[index].channelIds.length
			)
		) {
			//setRoleIn("ignore", guildID, updatedIgnoredRoleIns);
			db.settings.set(guildID, updatedIgnoredRoleIns, "ignore.onlyRoleIn");
		}
	});
};
