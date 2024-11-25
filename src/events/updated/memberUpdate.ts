import type { Client, ThreadChannel } from "discord.js";
import { CommandName } from "../../interface";
import { getConfig } from "../../maps";
import { changeGuildLanguage, discordLogs, logInDev } from "../../utils";
import { addUserToThread } from "../../utils/add";
import { checkMemberRole, checkMemberRoleIn, checkRoleIn, checkThread } from "../../utils/data_check";
import i18next from "i18next";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			changeGuildLanguage(newMember.guild);
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			/** Search updated roles */
			const oldRoles = oldMember.roles.cache;
			const newRoles = newMember.roles.cache;
			const updatedRoles = newRoles.filter(role => !oldRoles.has(role.id));
			const guildID = newMember.guild.id;
			if (getConfig(CommandName.member, guildID) === false) return;
			if (updatedRoles.size === 0) {
				await discordLogs(guildID, client, i18next.t("logs.member.updated.noRole", {user : oldMember.user.username}));
				return;
			}
			await discordLogs(guildID, client, i18next.t("logs.member.updated.roleList", {user : oldMember.user.username, role : updatedRoles.map(role => role.name).join(", ")}));
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter(channel => channel.isThread());
			for (const channel of channels.values()) {
				const threadChannel = channel as ThreadChannel;
				const updatedRoleAllowed = updatedRoles.filter(role => {
					logInDev(checkRoleIn("follow", role, threadChannel));
					return checkRoleIn("follow", role, threadChannel);});
				const ignoredUpdatedRole = updatedRoles.filter(role => {return checkRoleIn("ignore", role, threadChannel);});
				if (updatedRoleAllowed.size === 0) {
				} else if (ignoredUpdatedRole.size > 0) {
				} else {
					

					/**
				 * If checkMemberRoleInFollowed is true, ignore the two others condition and add the member to the thread
				 * Else, check the two others condition and add the member to the thread if they are true
				 */

					let roleIsAllowed = true;
					if (!checkMemberRoleIn("follow", newMember.roles, threadChannel)) {
						roleIsAllowed = checkMemberRole(newMember.roles, "follow") && !checkMemberRole(newMember.roles, "ignore") && checkMemberRoleIn("ignore", newMember.roles, threadChannel);
					}

					if (!getConfig(CommandName.followOnlyChannel, guildID)) {
					/**
					 * followOnlyChannel is disabled && followOnlyRole can be enabled or disabled
					 */
						if (!checkThread(threadChannel, "ignore") && roleIsAllowed) await addUserToThread(threadChannel, newMember);
					} else {
					/**
					 * followOnlyChannel is enabled && followOnlyRole can be enabled or disabled
					 */
						const followedThread = checkThread(threadChannel, "follow");
						if (roleIsAllowed && followedThread) await addUserToThread(threadChannel, newMember);
					}
				}
			}
		} catch (error) {
			console.error(error);
		}
	});
};
