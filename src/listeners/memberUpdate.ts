import { Client, ThreadChannel } from "discord.js";
import { CommandName, get } from "../maps";
import { addUserToThread, checkIfUserNotInTheThread, logInDev } from "../utils";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			if (get(CommandName.member) === false) return;
			logInDev(`${oldMember.user.username} has been updated!`);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter(channel => channel.isThread());
			const ignoredChannels = get(CommandName.ignore) as ThreadChannel[];
			for (const channel of channels.values()) {
				const threadChannel = channel as ThreadChannel;
				if (await checkIfUserNotInTheThread(threadChannel, newMember) && !ignoredChannels.includes(threadChannel)) {
					await addUserToThread(threadChannel, newMember);
				} //remove user from thread if not have permission
				else {
					//await removeUserFromThread(threadChannel, newMember);
				}
			}
		} catch (error) {
			console.error(error);
		}
	});
};
