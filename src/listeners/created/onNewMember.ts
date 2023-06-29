import { Client, ThreadChannel } from "discord.js";
import {getConfig } from "../../maps";
import { CommandName } from "../../interface";
import {
	addUserToThread,
	checkMemberRole, checkThread,
	checkIfThreadIsIgnored,
	checkMemberRoleNotIgnored,
	logInDev,
} from "../../utils";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for new member event, add them to thread they can see
 */

export default (client: Client): void => {
	client.on("guildMemberAdd", async (member) => {
		if (getConfig(CommandName.newMember) === false) return;
		if (member.user.bot) return;
		logInDev(`${member.user.username} joined the server`);
		const guild = member.guild;
		const channels = guild.channels.cache.filter(channel => channel.isThread());
		for (const channel of channels.values()) {
			const threadChannel = channel as ThreadChannel;
			const roleIsAllowed = !checkMemberRole(member.roles) && !checkMemberRoleNotIgnored(member.roles);
			if (!getConfig(CommandName.followOnlyChannel)) {
				if (!checkIfThreadIsIgnored(threadChannel) && roleIsAllowed) await addUserToThread(threadChannel, member);
			} else {
				if (roleIsAllowed && checkThread(threadChannel)) await addUserToThread(threadChannel, member);
			}
		}
		
	});
};
