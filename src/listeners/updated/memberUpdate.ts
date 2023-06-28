import { Client, ThreadChannel } from "discord.js";
import { CommandName, get } from "../../maps";
import {
	addUserToThread,
	checkIfMemberRoleIsFollowed,
	checkIfTheadIsFollowed,
	checkIfThreadIsIgnored,
	checkMemberRoleNotIgnored,
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
				const roleIsAllowed = checkIfMemberRoleIsFollowed(newMember.roles) && !checkMemberRoleNotIgnored(newMember.roles);
				if (!get(CommandName.followOnlyChannel)) {
				/**
				 * followOnlyChannel is disabled && followOnlyRole can be enabled or disabled
				 */
					if (!checkIfThreadIsIgnored(threadChannel) && roleIsAllowed) await addUserToThread(threadChannel, newMember);
				} else {
				/**
				 * followOnlyChannel is enabled && followOnlyRole can be enabled or disabled
				 */
					const followedThread = checkIfTheadIsFollowed(threadChannel);
					if (roleIsAllowed && followedThread) await addUserToThread(threadChannel, newMember);
				}
			}
		} catch (error) {
			console.error(error);
		}
	});
};
