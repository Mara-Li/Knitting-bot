import type { Client } from "discord.js";
import {
	deleteCachedMessage,
	getMaps,
	getRoleIn,
	setRoleIn,
	setTrackedItem,
} from "../../maps";

export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		console.info(`Thread deleted: ${thread.id}`);
		const guildID = thread.guild.id;

		// Clean up message cache for this thread
		deleteCachedMessage(guildID, thread.id);

		// Remove from thread ID lists
		const followedThreads = getMaps("follow", "thread", guildID);
		const ignoredThreads = getMaps("ignore", "thread", guildID);

		const filteredFollowed = followedThreads.filter((id) => id !== thread.id);
		const filteredIgnored = ignoredThreads.filter((id) => id !== thread.id);

		if (followedThreads.length !== filteredFollowed.length) {
			setTrackedItem("follow", "thread", guildID, filteredFollowed);
		}
		if (ignoredThreads.length !== filteredIgnored.length) {
			setTrackedItem("ignore", "thread", guildID, filteredIgnored);
		}

		// Remove from RoleIn channel ID lists
		const followedRoleIns = getRoleIn("follow", guildID);
		const ignoredRoleIns = getRoleIn("ignore", guildID);

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
			setRoleIn("follow", guildID, updatedFollowedRoleIns);
		}
		if (
			ignoredRoleIns.some(
				(roleIn, index) =>
					roleIn.channelIds.length !== updatedIgnoredRoleIns[index].channelIds.length
			)
		) {
			setRoleIn("ignore", guildID, updatedIgnoredRoleIns);
		}
	});
};
