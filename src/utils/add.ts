import {
	DiscordAPIError,
	type GuildMember,
	type Message,
	MessageFlags,
	type Role,
	type ThreadChannel,
	userMention,
} from "discord.js";
import { getTranslation } from "../i18n";
import { EMOJI } from "../index";
import { CommandName } from "../interface";
import { getConfig, optionMaps } from "../maps";
import {
	checkIfUserNotInTheThread,
	checkMemberRole,
	checkMemberRoleIn,
	checkRole,
	checkRoleIn,
	getMemberPermission,
} from "./data_check";
import { discordLogs } from "./index";

/**
 * Add a user to a thread, with verification the permission.
 * Check if the role is allowed by the settings for the thread.
 * @param thread {@link ThreadChannel} The thread to add the user
 * @param user {@link GuildMember} The user to add
 */
export async function addUserToThread(thread: ThreadChannel, user: GuildMember) {
	const guild = thread.guild.id;
	const ul = getTranslation(guild, { locale: thread.guild.preferredLocale });
	const emoji = optionMaps.get(guild, "messageToSend") ?? EMOJI;
	if (
		thread.permissionsFor(user).has("ViewChannel", true) &&
		(await checkIfUserNotInTheThread(thread, user))
	) {
		try {
			let message = await fetchMessage(thread);
			if (getConfig(CommandName.followOnlyRoleIn, guild)) {
				if (message) {
					await message.edit(userMention(user.id));
					await message.edit(emoji);
				} else {
					message = await thread.send({
						content: emoji,
						flags: MessageFlags.SuppressNotifications,
					});
					await message.edit(userMention(user.id));
					await message.edit(emoji);
				}
				await discordLogs(
					guild,
					thread.client,
					`Add @${user.user.username} to #${thread.name}`
				);
			} else if (!checkMemberRole(user.roles, "ignore")) {
				if (message) {
					await message.edit(userMention(user.id));
					await message.edit(emoji);
				} else {
					message = await thread.send({
						content: emoji,
						flags: MessageFlags.SuppressNotifications,
					});
					await message.edit(userMention(user.id));
					await message.edit(emoji);
				}
				await discordLogs(
					guild,
					thread.client,
					`Add @${user.user.username} to #${thread.name}`
				);
			} else if (
				getConfig(CommandName.followOnlyRole, guild) &&
				checkMemberRole(user.roles, "follow")
			) {
				if (message) {
					await message.edit(userMention(user.id));
					await message.edit(emoji);
				} else {
					message = await thread.send({
						content: emoji,
						flags: MessageFlags.SuppressNotifications,
					});
					await message.edit(userMention(user.id));
					await message.edit(emoji);
				}
				await discordLogs(
					guild,
					thread.client,
					`Add @${user.user.username} to #${thread.name}`
				);
			}
		} catch (error) {
			console.error(error);
			if (error instanceof DiscordAPIError && error.code === 50001)
				await discordLogs(
					guild,
					thread.client,
					ul("error.missingPermission", { thread: thread.id })
				);
		}
	}
}

/**
 * Add a list to user to a thread, with verification the permission. After, send a message to ping the user and remove it.
 * @param thread
 * @param members
 */
export async function getUsersToPing(thread: ThreadChannel, members: GuildMember[]) {
	const guild = thread.guild.id;
	const usersToBeAdded: GuildMember[] = [];
	for (const member of members) {
		if (
			thread.permissionsFor(member).has("ViewChannel", true) &&
			(await checkIfUserNotInTheThread(thread, member))
		) {
			if (
				getConfig(CommandName.followOnlyRoleIn, guild) &&
				checkMemberRoleIn("follow", member.roles, thread)
			) {
				usersToBeAdded.push(member);
			} else if (
				getConfig(CommandName.followOnlyRole, guild) &&
				checkMemberRole(member.roles, "follow") &&
				!getConfig(CommandName.followOnlyRoleIn, guild)
			) {
				usersToBeAdded.push(member);
			} else if (
				!getConfig(CommandName.followOnlyRole, guild) &&
				!checkMemberRole(member.roles, "ignore") &&
				!checkMemberRoleIn("ignore", member.roles, thread) &&
				!getConfig(CommandName.followOnlyRoleIn, guild)
			) {
				usersToBeAdded.push(member);
			}
		}
	}
	return usersToBeAdded;
}

/**
 * Same as above, but for a role
 * @param thread
 * @param roles
 */
export async function getRoleToPing(thread: ThreadChannel, roles: Role[]) {
	const guild = thread.guild.id;
	const roleToBeAdded: Role[] = [];
	for (const role of roles) {
		//check if all members of the role are in the thread
		const membersInTheThread = thread.members.cache;
		const membersOfTheRoleNotInTheThread = role.members.filter(
			(member) => !membersInTheThread.has(member.id)
		);
		if (
			role.name !== "@everyone" &&
			thread.permissionsFor(role).has("ViewChannel", true) &&
			role.members.size > 0 &&
			membersOfTheRoleNotInTheThread.size > 0
		) {
			if (checkRoleIn("follow", role, thread)) {
				roleToBeAdded.push(role);
			} else if (!getConfig(CommandName.followOnlyRoleIn, guild)) {
				if (getConfig(CommandName.followOnlyRole, guild) && checkRole(role, "follow")) {
					roleToBeAdded.push(role);
				} else if (
					!getConfig(CommandName.followOnlyRoleIn, guild) &&
					!getConfig(CommandName.followOnlyRole, guild) &&
					!checkRole(role, "ignore") &&
					!checkRoleIn("ignore", role, thread)
				) {
					roleToBeAdded.push(role);
				}
			}
		}
	}
	return roleToBeAdded;
}

/**
 * Add all members that have the permission to view the thread, first check by their role and after add the member that have overwrite permission
 * if there is no role in the server, check all members directly
 * @param thread {@link ThreadChannel} The thread to add the user
 */
export async function addRoleAndUserToThread(thread: ThreadChannel) {
	const members = thread.guild.members.cache;
	const toPing: GuildMember[] = [];
	const rolesWithAccess: Role[] = thread.guild.roles.cache.toJSON();
	if (rolesWithAccess.length > 0) {
		try {
			getRoleToPing(thread, rolesWithAccess).then((roles) => {
				roles.forEach((role) => {
					toPing.push(...role.members.toJSON());
				});
			});
		} catch (error) {
			console.error(error);
		}
	} else {
		const guildMembers: GuildMember[] = members.toJSON();
		await getUsersToPing(thread, guildMembers).then((users) => {
			toPing.push(...users);
		});
	}
	//getConfig all member that have access to the thread (overwriting permission)
	//use cache
	const reloadMembers = thread.guild.members.cache;
	const memberWithAccess = getMemberPermission(reloadMembers, thread);
	if (memberWithAccess) {
		const memberWithAccessArray: GuildMember[] = memberWithAccess.toJSON();
		await getUsersToPing(thread, memberWithAccessArray).then((users) => {
			toPing.push(...users);
		});
	}
	const emoji = optionMaps.get(thread.guild.id, "messageToSend") ?? EMOJI;
	if (toPing.length > 0) {
		try {
			const message = await fetchMessage(thread);
			await splitAndSend(toPing, message);
			await message.edit(emoji);
			await discordLogs(
				thread.guild.id,
				thread.client,
				`Add ${toPing.length} members to #${thread.name}:\n- ${toPing.map((member) => member.user.username).join("\n- ")}`
			);
		} catch (error) {
			console.error(error);
			if (error instanceof DiscordAPIError && error.code === 50001) {
				await discordLogs(
					thread.guild.id,
					thread.client,
					getTranslation(thread.guild.id, {
						locale: thread.guild.preferredLocale,
					})("error.missingPermission", { thread: thread.id })
				);
			}
		}
	}
}

async function splitAndSend(toPing: GuildMember[], message: Message) {
	//okay on réfléchit.
	//On envoie par id sous forme de <@id> ce qui fait que l'on a :
	//longueur d'un user mention = 2(<@) + 18(id) + 1(>) + 1 (& si c'est un rôle) = 21-22
	//soit 2000 / 22 = 90,9
	//Vu que la longueur max d'un message est de 2000 caractères, on peut envoyer 90 mentions par message
	const maxMentions = 90;
	let currentMessage = "";
	for (let i = 0; i < toPing.length; i++) {
		const mention = `<@${toPing[i].id}>`;
		if (currentMessage.length + mention.length > 2000) {
			await message.edit(currentMessage);
			currentMessage = "";
		}
		currentMessage += `${mention} `;
		if ((i + 1) % maxMentions === 0 || i === toPing.length - 1) {
			await message.edit(currentMessage);
			currentMessage = "";
		}
	}
	// If there is still a message to send, send it
	if (currentMessage.length > 0) {
		await message.edit(currentMessage);
	}
	// Send the emoji at the end
	const emoji = optionMaps.get(message.guild!.id, "messageToSend") ?? EMOJI;
	return await message.edit(emoji);
}

export async function fetchUntilMessage(
	thread: ThreadChannel
): Promise<Message | undefined | null> {
	const fetchMessage = await thread.messages.fetch({ limit: 100 });
	let find = fetchMessage.filter((m) => m.author.id === thread.client.user.id).first();

	// Return early if found
	if (find) return find;

	// Limit iterations to prevent infinite loops
	const maxIterations = 10;
	let iterations = 0;
	let previousLastMessageId: string | undefined;

	while (!find && fetchMessage.size === 100 && iterations < maxIterations) {
		iterations++;
		const lastMessageId = fetchMessage.last()?.id;
		// Break if no valid message ID or if we're stuck on the same message
		if (!lastMessageId || lastMessageId === previousLastMessageId) break;
		previousLastMessageId = lastMessageId;
		const moreMessages = await thread.messages.fetch({
			before: lastMessageId,
			limit: 100,
		});
		// Break if no new messages were fetched
		if (moreMessages.size === 0) break;
		find = moreMessages.filter((m) => m.author.id === thread.client.user.id).first();
		// If found, return immediately
		if (find) return find;
	}
	return find ?? null;
}

async function fetchAllPinnedMessages(
	thread: ThreadChannel
): Promise<Message | undefined> {
	const pinnedMessage = await thread.messages.fetchPins({ limit: 50 });
	let find = pinnedMessage.items.find(
		(m) => m.message.author.id === thread.client.user.id
	);

	// Return early if found
	if (find) return find.message;

	// Limit iterations to prevent infinite loops
	const maxIterations = 10;
	let iterations = 0;
	let previousLastMessageId: string | undefined;

	while (!find && pinnedMessage.hasMore && iterations < maxIterations) {
		iterations++;
		const lastMessageId = pinnedMessage.items[pinnedMessage.items.length - 1]?.message.id;

		// Break if no valid message ID or if we're stuck on the same message
		if (!lastMessageId || lastMessageId === previousLastMessageId) break;

		previousLastMessageId = lastMessageId;

		const moreMessages = await thread.messages.fetchPins({
			before: lastMessageId,
			limit: 50,
		});

		// Break if no new messages were fetched
		if (moreMessages.items.length === 0) break;

		find = moreMessages.items.find((m) => m.message.author.id === thread.client.user.id);

		// If found, return immediately
		if (find) return find.message;

		// Update hasMore status
		if (!moreMessages.hasMore) break;
	}

	return undefined;
}

async function fetchFirstMessage(
	thread: ThreadChannel
): Promise<Message | undefined | null> {
	const pin = optionMaps.get(thread.guild.id, "pin");
	if (pin) {
		//fetch pinned messages
		const pinnedMessages = thread.messages.cache.filter((m) => m.pinned);
		const firstPinnedMessage = pinnedMessages
			.filter((m) => m.author.id === thread.client.user.id)
			.first();
		if (firstPinnedMessage) return firstPinnedMessage;
		const fetchedPinnedMessages = await fetchAllPinnedMessages(thread);
		if (fetchedPinnedMessages) return fetchedPinnedMessages;
	}
	const fetchedMessage = thread.messages.cache;
	const firstMessage = fetchedMessage.find((m) => m.author.id === thread.client.user.id);
	if (!firstMessage) return await fetchUntilMessage(thread);
}

async function sendAndPin(thread: ThreadChannel): Promise<Message> {
	const toPin = optionMaps.get(thread.guild.id, "pin");
	const messageToSend = optionMaps.get(thread.guild.id, "messageToSend") ?? EMOJI;
	const message = await thread.send({
		content: messageToSend,
		flags: MessageFlags.SuppressNotifications,
	});
	if (toPin) await message.pin();

	return message;
}

async function fetchMessage(thread: ThreadChannel): Promise<Message> {
	const firstMessage = await fetchFirstMessage(thread);
	return firstMessage ?? (await sendAndPin(thread));
}
