import type { Client, ThreadChannel } from "discord.js";
import i18next from "i18next";
import { CommandName } from "../../interface";
import { getConfig } from "../../maps";
import { changeGuildLanguage, discordLogs, logInDev, updateCache } from "../../utils";
import { addUserToThread } from "../../utils/add";
import {
	checkMemberRole,
	checkMemberRoleIn,
	checkRoleIn,
	checkThread,
} from "../../utils/data_check";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			changeGuildLanguage(newMember.guild);
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			/** Search updated roles */
			const oldRoles = oldMember.roles.cache;
			const newRoles = newMember.roles.cache;
			const updatedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
			const guildID = newMember.guild.id;
			await updateCache(newMember.guild);
			if (getConfig(CommandName.member, guildID) === false) return;
			if (updatedRoles.size === 0) {
				await discordLogs(
					guildID,
					client,
					i18next.t("logs.member.updated.noRole", {
						user: oldMember.user.username,
					})
				);
				return;
			}
			await discordLogs(
				guildID,
				client,
				i18next.t("logs.member.updated.roleList", {
					role: updatedRoles.map((role) => role.name).join(", "),
					user: oldMember.user.username,
				})
			);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter((channel) => channel.isThread());
			for (const channel of channels.values()) {
				const threadChannel = channel as ThreadChannel;
				const updatedRoleAllowed = updatedRoles.filter((role) => {
					return checkRoleIn("follow", role, threadChannel);
				});
				const ignoredUpdatedRole = updatedRoles.filter((role) => {
					return checkRoleIn("ignore", role, threadChannel);
				});
				/*
				 * If no updated role is in follow roles or the role is ignored, continue to the next thread
				 */
				if (updatedRoleAllowed.size === 0 || ignoredUpdatedRole.size > 0) continue;
				/**
				 * If checkMemberRoleInFollowed is true, ignore the two others condition and add the member to the thread
				 * Else, check the two others condition and add the member to the thread if they are true
				 */

				let roleIsAllowed = true;
				if (!checkMemberRoleIn("follow", newMember.roles, threadChannel)) {
					roleIsAllowed =
						checkMemberRole(newMember.roles, "follow") &&
						!checkMemberRole(newMember.roles, "ignore") &&
						checkMemberRoleIn("ignore", newMember.roles, threadChannel);
				}

				if (!getConfig(CommandName.followOnlyChannel, guildID)) {
					/**
					 * followOnlyChannel is disabled && followOnlyRole can be enabled or disabled
					 */
					if (!checkThread(threadChannel, "ignore") && roleIsAllowed)
						await addUserToThread(threadChannel, newMember);
				} else {
					/**
					 * followOnlyChannel is enabled && followOnlyRole can be enabled or disabled
					 */
					const followedThread = checkThread(threadChannel, "follow");
					if (roleIsAllowed && followedThread)
						await addUserToThread(threadChannel, newMember);
				}
			}
		} catch (error) {
			console.error(error);
			logInDev(`Error on memberUpdate: ${error}`);
		}
		logInDev(`Member ${newMember.user.username} has been updated.`);
	});
};
