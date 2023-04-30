import { Client,ThreadChannel } from "discord.js";
import { addUserToThread, checkIfUserNotInTheThread, removeUserFromThread } from "../utils";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			console.log(`${oldMember.user.username} has been updated!`);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter(channel => channel.isThread());
			for (const channel of channels.values()) {
				const threadChannel = channel as ThreadChannel;
				if (await checkIfUserNotInTheThread(threadChannel, newMember)) {
					await addUserToThread(threadChannel, newMember);
				} //remove user from thread if not have permission
				else {
					//await removeUserFromThread(threadChannel, newMember);
				}
			}
		} catch (error) {
			console.log(error);
		}
	});
};
