import { Client, ThreadChannel } from "discord.js";
import { TypeName } from "../../interface";
import {
	getMaps,
	getRoleIn,
	setFollow,
	setIgnore,
	setRoleIn,
} from "../../maps";
import { logInDev } from "../../utils";

export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		const guildID = thread.guild.id;
		const threadIsFollowed = getMaps("follow", TypeName.thread, guildID).some(
			(followed) => followed.id === thread.id,
		);
		const threadIsIgnored = getMaps("ignore", TypeName.thread, guildID).some(
			(ignored) => ignored.id === thread.id,
		);
		const FollowedThreadInRoleIn = getRoleIn("follow", guildID).some(
			(followed) => {
				const followedThread = followed.channels;
				return followedThread.some(
					(followedThread) => followedThread.id === thread.id,
				);
			},
		);
		const IgnoredThreadInRoleIn = getRoleIn("ignore", guildID).some(
			(ignored) => {
				const ignoredThread = ignored.channels;
				return ignoredThread.some(
					(ignoredThread) => ignoredThread.id === thread.id,
				);
			},
		);
		if (FollowedThreadInRoleIn) {
			const followed = getRoleIn("follow", guildID);
			const index = followed.findIndex((followed) => {
				const followedThread = followed.channels;
				return followedThread.some(
					(followedThread) => followedThread.id === thread.id,
				);
			});
			const followedThread = followed[index].channels;
			const threadIndex = followedThread.findIndex(
				(followedThread) => followedThread.id === thread.id,
			);
			followedThread.splice(threadIndex, 1);
			setRoleIn("follow", guildID, followed);
		}
		if (IgnoredThreadInRoleIn) {
			const ignored = getRoleIn("ignore", guildID);
			const index = ignored.findIndex((ignored) => {
				const ignoredThread = ignored.channels;
				return ignoredThread.some(
					(ignoredThread) => ignoredThread.id === thread.id,
				);
			});
			const ignoredThread = ignored[index].channels;
			const threadIndex = ignoredThread.findIndex(
				(ignoredThread) => ignoredThread.id === thread.id,
			);
			ignoredThread.splice(threadIndex, 1);
			setRoleIn("ignore", guildID, ignored);
		}
		if (threadIsFollowed) {
			const followed = getMaps(
				"follow",
				TypeName.thread,
				guildID,
			) as ThreadChannel[];
			const index = followed.findIndex((followed) => followed.id === thread.id);
			followed.splice(index, 1);
			setFollow(TypeName.thread, guildID, followed);
		}
		if (threadIsIgnored) {
			const ignored = getMaps(
				"ignore",
				TypeName.thread,
				guildID,
			) as ThreadChannel[];
			const index = ignored.findIndex((ignored) => ignored.id === thread.id);
			ignored.splice(index, 1);
			setIgnore(TypeName.thread, guildID, ignored);
		}
	});
};
