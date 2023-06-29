import {Client} from "discord.js";
import {getMaps, getRoleIn, setFollow, setIgnore, setRoleIn } from "../../maps";
import { TypeName } from "../../interface";
import { logInDev } from "../../utils";


export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		const threadIsFollowed = getMaps("follow", TypeName.thread).some((followed) => followed.id === thread.id);
		const threadIsIgnored = getMaps("ignore",TypeName.thread).some((ignored) => ignored.id === thread.id);
		const FollowedThreadInRoleIn = getRoleIn("follow").some((followed) =>{
			const followedThread = followed.channels;
			return followedThread.some((followedThread) => followedThread.id === thread.id);
		});
		const IgnoredThreadInRoleIn = getRoleIn("ignore").some((ignored) =>{
			const ignoredThread = ignored.channels;
			return ignoredThread.some((ignoredThread) => ignoredThread.id === thread.id);
		});
		if (FollowedThreadInRoleIn) {
			const followed = getRoleIn("follow");
			const index = followed.findIndex((followed) =>{
				const followedThread = followed.channels;
				return followedThread.some((followedThread) => followedThread.id === thread.id);
			});
			const followedThread = followed[index].channels;
			const threadIndex = followedThread.findIndex((followedThread) => followedThread.id === thread.id);
			followedThread.splice(threadIndex, 1);
			setRoleIn("follow", followed);
			logInDev(`Thread ${thread.name} removed from follow list in a channel`);
		}
		if (IgnoredThreadInRoleIn) {
			const ignored = getRoleIn("ignore");
			const index = ignored.findIndex((ignored) =>{
				const ignoredThread = ignored.channels;
				return ignoredThread.some((ignoredThread) => ignoredThread.id === thread.id);
			});
			const ignoredThread = ignored[index].channels;
			const threadIndex = ignoredThread.findIndex((ignoredThread) => ignoredThread.id === thread.id);
			ignoredThread.splice(threadIndex, 1);
			setRoleIn("ignore", ignored);
			logInDev(`Thread ${thread.name} removed from ignore list in a channel`);
		}
		if (threadIsFollowed) {
			const followed = getMaps("follow",TypeName.thread);
			const index = followed.findIndex((followed) => followed.id === thread.id);
			followed.splice(index, 1);
			setFollow(TypeName.thread, followed);
			logInDev(`Thread ${thread.name} removed from follow list`);
		}
		if (threadIsIgnored) {
			const ignored = getMaps("ignore",TypeName.thread);
			const index = ignored.findIndex((ignored) => ignored.id === thread.id);
			ignored.splice(index, 1);
			setIgnore(TypeName.thread, ignored);
			logInDev(`Thread ${thread.name} removed from ignore list`);
		}
	});
};
