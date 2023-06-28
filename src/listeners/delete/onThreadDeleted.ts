import {Client} from "discord.js";
import { getFollow, getIgnored, setFollow, setIgnore, TypeName } from "../../maps";


export default (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		const threadIsFollowed = getFollow(TypeName.thread).some((followed) => followed.id === thread.id);
		const threadIsIgnored = getIgnored(TypeName.thread).some((ignored) => ignored.id === thread.id);
		if (threadIsFollowed) {
			const followed = getFollow(TypeName.thread);
			const index = followed.findIndex((followed) => followed.id === thread.id);
			followed.splice(index, 1);
			setFollow(TypeName.thread, followed);
		}
		if (threadIsIgnored) {
			const ignored = getIgnored(TypeName.thread);
			const index = ignored.findIndex((ignored) => ignored.id === thread.id);
			ignored.splice(index, 1);
			setIgnore(TypeName.thread, ignored);
		}
	});
};
