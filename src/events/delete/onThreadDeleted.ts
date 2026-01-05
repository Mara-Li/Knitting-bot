import type { Client } from "discord.js";
import { TypeName } from "../../interface";
import {
	deleteCachedMessage,
	getMaps,
	getRoleIn,
	setFollow,
	setIgnore,
	setRoleIn,
} from "../../maps";

export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		const guildID = thread.guild.id;

		// Clean up message cache for this thread
		deleteCachedMessage(guildID, thread.id);

		// Remove from thread ID lists
		const followedThreads = getMaps("follow", TypeName.thread, guildID);
		const ignoredThreads = getMaps("ignore", TypeName.thread, guildID);

		const filteredFollowed = followedThreads.filter((id) => id !== thread.id);
		const filteredIgnored = ignoredThreads.filter((id) => id !== thread.id);

		if (followedThreads.length !== filteredFollowed.length) {
			setFollow(TypeName.thread, guildID, filteredFollowed);
		}
		if (ignoredThreads.length !== filteredIgnored.length) {
			setIgnore(TypeName.thread, guildID, filteredIgnored);
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
