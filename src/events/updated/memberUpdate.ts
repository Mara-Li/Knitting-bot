import * as Djs from "discord.js";
import db from "../../database";
import { getTranslation } from "../../i18n";
import { discordLogs } from "../../utils";
import { addUserToThread } from "../../utils/add";
import { runWithConcurrency } from "../../utils/concurrency";
import {
	checkMemberRole,
	checkMemberRoleIn,
	checkRoleIn,
	checkThread,
} from "../../utils/data_check";

export default (client: Djs.Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		try {
			const guildID = newMember.guild.id;
			const onMemberUpdate = db.settings.get(guildID, "configuration.onMemberUpdate");
			if (!onMemberUpdate) return;
			if (oldMember.nickname != null && oldMember.nickname !== newMember.nickname) return;
			const oldRoles = oldMember.roles.cache;
			const newRoles = newMember.roles.cache;
			if (oldRoles.equals(newRoles)) return;
			/** Search updated roles from logs as it is more accurate */
			const updatedRoles = await updatedRolesFromLogs(oldMember, newMember);
			const ul = getTranslation(guildID, { locale: newMember.guild.preferredLocale });
			if (!updatedRoles || updatedRoles.size === 0) {
				await discordLogs(
					guildID,
					client,
					false,
					ul("logs.member.updated.noRole", {
						user: oldMember.user.username,
					})
				);
				return;
			}
			await discordLogs(
				guildID,
				client,
				false,
				ul("logs.member.updated.roleList", {
					role: updatedRoles.map((role) => role.name).join(", "),
					user: oldMember.user.username,
				})
			);
			const guild = newMember.guild;
			const channels = guild.channels.cache.filter((channel) => channel.isThread());
			const followOnlyChannelEnabled =
				db.settings.get(guildID, "configuration.followOnlyChannel") ??
				db.defaultValues.configuration.followOnlyChannel;

			// Collect promises to add users to threads so we can run them in parallel
			const tasks: Array<() => Promise<unknown>> = [];
			const toAdd: string[] = [];
			for (const threadChannel of channels.values()) {
				toAdd.push(threadChannel.id);
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

				if (shouldAddUser)
					tasks.push(async () => addUserToThread(threadChannel, newMember));
			}

			if (tasks.length > 0) {
				const results = await runWithConcurrency(tasks, 3);
				if (toAdd.length > 0) {
					const formattedToAdd =
						toAdd.length === 1
							? `<#${toAdd[0]}>`
							: `\n- ${toAdd.map((id) => `<#${id}>`).join("\n- ")}`;

					await discordLogs(
						guildID,
						client,
						false,
						ul("logs.member.updated.addedThreads_other", {
							count: toAdd.length,
							threads: formattedToAdd,
							user: `<@${newMember.user.id}>`,
						})
					);
				} else {
					await discordLogs(
						guildID,
						client,
						false,
						ul("logs.member.updated.error", {
							user: `<@${newMember.user.id}>`,
						})
					);
				}
				//log errors
				for (const r of results) {
					if (r.status === "rejected") console.warn("addUserToThread failed:", r.reason);
				}
			}
		} catch (error) {
			if (error instanceof Djs.DiscordAPIError && error.code === 50013) {
				const ul = getTranslation(newMember.guild.id, {
					locale: newMember.guild.preferredLocale,
				});
				// Missing Permissions //send a message to the log channel + warn the server owner
				if (db.settings.get(newMember.guild.id, "configuration.log")) {
					await discordLogs(
						newMember.guild.id,
						client,
						false,
						ul("logs.missingPermissions")
					);
				} else {
					const owner = await newMember.guild.fetchOwner();
					await owner.send(
						ul("logs.owner", {
							guild: newMember.guild.name,
						})
					);
				}
			} else console.error(error);
		}
	});
};

async function updatedRolesFromLogs(
	oldMember: Djs.PartialGuildMember | Djs.GuildMember,
	newMember: Djs.GuildMember
) {
	const fetchLogs = await newMember.guild.fetchAuditLogs({
		limit: 1,
		type: Djs.AuditLogEvent.MemberRoleUpdate,
	});
	const roleLog = fetchLogs.entries.first();
	if (!roleLog) return;
	const { target, changes } = roleLog;
	if (!target || !changes) return;
	if (target.id !== oldMember.id) return;
	//detect the roles that was added
	const addedRoles = changes.find(
		(change) => change.key === "$add" && change.new?.length
	);
	let newRoles = addedRoles?.new;
	if (!addedRoles || !newRoles) return;
	newRoles = newRoles as { name: string; id: string }[];
	//create a collection of roles from the newRoles ids
	const updatedRoles = new Djs.Collection<string, Djs.Role>();
	newRoles.forEach((roleId) => {
		const role = newMember.roles.cache.find((r) => r.id === roleId.id);
		if (role) updatedRoles.set(roleId.id, role);
	});
	return updatedRoles;
}
