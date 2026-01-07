import type { Client, ThreadChannel } from "discord.js";
import { getTranslation } from "../../i18n";
import { CommandName } from "../../interface";
import { getConfig } from "../../maps";
import { discordLogs, logInDev } from "../../utils";
import { addUserToThread } from "../../utils/add";
import { checkMemberRole, checkThread } from "../../utils/data_check";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for new member event, add them to thread they can see
 */

export default (client: Client): void => {
	client.on("guildMemberAdd", async (member) => {
		const guildID = member.guild.id;
		if (!getConfig(CommandName.newMember, guildID)) return;
		if (member.user.bot) return;
		logInDev(`${member.user.username} joined the server`);
		const ul = getTranslation(guildID, { locale: member.guild.preferredLocale });
		await discordLogs(guildID, client, ul("logs.joined", { user: member.user.username }));
		const guild = member.guild;
		const channels = guild.channels.cache.filter((channel) => channel.isThread());

		// Process threads with a delay to avoid rate limiting
		for (const channel of channels.values()) {
			const threadChannel = channel as ThreadChannel;
			const roleIsAllowed =
				!checkMemberRole(member.roles, "follow") &&
				!checkMemberRole(member.roles, "ignore");
			if (!getConfig(CommandName.followOnlyChannel, guildID)) {
				if (!checkThread(threadChannel, "ignore") && roleIsAllowed)
					await addUserToThread(threadChannel, member);
			} else {
				if (roleIsAllowed && checkThread(threadChannel, "follow"))
					await addUserToThread(threadChannel, member);
			}
			// Add delay between requests to avoid gateway rate limit
			await new Promise((resolve) => setTimeout(resolve, 250));
		}
	});
};
