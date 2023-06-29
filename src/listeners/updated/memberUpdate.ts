import { Client, ThreadChannel } from "discord.js";
import { getConfig } from "../../maps";
import {
	logInDev,
} from "../../utils";
import { CommandName } from "../../interface";
import { addUserToThread } from "../../utils/add";
import { checkMemberRole, checkMemberRoleIn, checkThread } from "../../utils/data_check";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			if (getConfig(CommandName.member) === false) return;
			logInDev(`${oldMember.user.username} has been updated!`);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter(channel => channel.isThread());
			logInDev(channels.map(channel => channel.name));
			for (const channel of channels.values()) {
				const threadChannel = channel as ThreadChannel;
				logInDev("Role member is followed :", checkMemberRole(newMember.roles, "follow"));
				logInDev("Role member is ignored :", checkMemberRole(newMember.roles, "ignore"));
				logInDev("Role member is in thread followed :", checkMemberRoleIn("follow",newMember.roles, threadChannel));
				
				/**
				 * If checkMemberRoleInFollowed is true, ignore the two others condition and add the member to the thread
				 * Else, check the two others condition and add the member to the thread if they are true
				 */
				
				let roleIsAllowed = true;
				if (!checkMemberRoleIn("follow", newMember.roles, threadChannel)) {
					roleIsAllowed = checkMemberRole(newMember.roles, "follow") && !checkMemberRole(newMember.roles, "ignore");
				}
				
				logInDev(`Role is allowed: ${roleIsAllowed}`);
				if (!getConfig(CommandName.followOnlyChannel)) {
					/**
					 * followOnlyChannel is disabled && followOnlyRole can be enabled or disabled
					 */
					logInDev("followOnlyChannel is disabled");
					logInDev(`checkIfThreadIsIgnored: ${checkThread(threadChannel, "ignore")}`);
					if (!checkThread(threadChannel, "ignore") && roleIsAllowed) await addUserToThread(threadChannel, newMember);
				} else {
					/**
					 * followOnlyChannel is enabled && followOnlyRole can be enabled or disabled
					 */
					logInDev("followOnlyChannel is enabled");
					const followedThread = checkThread(threadChannel, "follow");
					if (roleIsAllowed && followedThread) await addUserToThread(threadChannel, newMember);
				}
			}
		} catch (error) {
			console.error(error);
		}
	});
};
