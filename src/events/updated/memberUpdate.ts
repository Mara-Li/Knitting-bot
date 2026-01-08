import type { Client, ThreadChannel } from "discord.js";
import { getTranslation } from "../../i18n";
import { getConfig } from "../../maps";
import { discordLogs } from "../../utils";
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
			if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
			/** Search updated roles */
			const oldRoles = oldMember.roles.cache;
			const newRoles = newMember.roles.cache;
			const updatedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
			const guildID = newMember.guild.id;

			if (!getConfig("onMemberUpdate", guildID)) return;
			const ul = getTranslation(guildID, { locale: newMember.guild.preferredLocale });
			if (updatedRoles.size === 0) {
				await discordLogs(
					guildID,
					client,
					ul("logs.member.updated.noRole", {
						user: oldMember.user.username,
					})
				);
				return;
			}
			await discordLogs(
				guildID,
				client,
				ul("logs.member.updated.roleList", {
					role: updatedRoles.map((role) => role.name).join(", "),
					user: oldMember.user.username,
				})
			);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter((channel) => channel.isThread());
			const followOnlyChannelEnabled = getConfig("followOnlyChannel", guildID);

			// Collect promises to add users to threads so we can run them in parallel
			const addPromises: Promise<unknown>[] = [];
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

				let shouldAddUser = false;
				if (!followOnlyChannelEnabled) {
					/**
					 * followOnlyChannel is disabled && followOnlyRole can be enabled or disabled
					 */
					shouldAddUser = !checkThread(threadChannel, "ignore") && roleIsAllowed;
				} else {
					/**
					 * followOnlyChannel is enabled && followOnlyRole can be enabled or disabled
					 */
					shouldAddUser = roleIsAllowed && checkThread(threadChannel, "follow");
				}

				if (shouldAddUser) {
					addPromises.push(addUserToThread(threadChannel, newMember));
				}
			}

			// Await all add operations and log any failures without failing the whole handler
			if (addPromises.length > 0) {
				const results = await Promise.allSettled(addPromises);
				for (const r of results) {
					if (r.status === "rejected") {
						console.error("addUserToThread failed:", r.reason);
					}
				}
			}
		} catch (error) {
			console.error(error);
		}
	});
};
