import { Client, ThreadChannel } from "discord.js";
import { CommandName, get } from "../../maps";
import {
	addUserToThread,
	checkIfRoleIsFollowed, checkIfTheadIsFollowed,
	checkIfThreadIsIgnored,
	checkIfUserNotInTheThread,
	checkRoleNotIgnored,
	logInDev,
} from "../../utils";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			if (get(CommandName.member) === false) return;
			logInDev(`${oldMember.user.username} has been updated!`);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter(channel => channel.isThread());
			
			for (const channel of channels.values()) {
				const threadChannel = channel as ThreadChannel;
				if (!get(CommandName.followOnly)) {
					if (await checkIfUserNotInTheThread(threadChannel, newMember) && !checkIfThreadIsIgnored(threadChannel) && !checkRoleNotIgnored(newMember.roles)) {
						await addUserToThread(threadChannel, newMember);
					}
				} else {
					const threadFollowed = checkIfTheadIsFollowed(threadChannel);
					const followedRole = checkIfRoleIsFollowed(newMember.roles);
					const notInThread = await checkIfUserNotInTheThread(threadChannel, newMember);
					if (threadFollowed && followedRole && notInThread) {
						await addUserToThread(threadChannel, newMember);
					}
				}
			}
		} catch (error) {
			console.error(error);
		}
	});
};
