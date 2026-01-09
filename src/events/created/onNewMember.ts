import type { Client, ThreadChannel } from "discord.js";
import { getTranslation } from "../../i18n";
import { getConfig } from "../../maps";
import { discordLogs } from "../../utils";
import { addUserToThread } from "../../utils/add";
import { runWithConcurrency } from "../../utils/concurrency";
import { checkMemberRole, checkThread } from "../../utils/data_check";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for new member event, add them to thread they can see
 */

export default (client: Client): void => {
	client.on("guildMemberAdd", async (member) => {
		const guildID = member.guild.id;
		if (!getConfig("onNewMember", guildID)) return;
		if (member.user.bot) return;
		const ul = getTranslation(guildID, { locale: member.guild.preferredLocale });
		await discordLogs(guildID, client, ul("logs.joined", { user: member.user.username }));
		const guild = member.guild;
		const channels = guild.channels.cache.filter((channel) => channel.isThread());

		// Process threads in parallel with concurrency control
		const tasks: Array<() => Promise<unknown>> = Array.from(channels.values()).map(
			(channel) => {
				return async () => {
					const threadChannel = channel as ThreadChannel;
					const roleIsAllowed =
						!checkMemberRole(member.roles, "follow") &&
						!checkMemberRole(member.roles, "ignore");
					if (!getConfig("followOnlyChannel", guildID)) {
						if (!checkThread(threadChannel, "ignore") && roleIsAllowed)
							return addUserToThread(threadChannel, member);
					} else {
						if (roleIsAllowed && checkThread(threadChannel, "follow"))
							return addUserToThread(threadChannel, member);
					}
					return Promise.resolve();
				};
			}
		);

		await runWithConcurrency(tasks, 10);
	});
};
