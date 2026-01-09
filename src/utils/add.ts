import * as Djs from "discord.js";
import db from "../database";
import { getTranslation } from "../i18n";
import {
	checkMemberRole,
	checkMemberRoleIn,
	checkRole,
	checkRoleIn,
	getMemberPermission,
	isUserInThread,
} from "./data_check";
import { discordLogs } from "./index";

/**
 * Check if a user should be added to the thread based on guild configuration
 * @param user - Guild member to check
 * @param thread - Thread channel
 * @param guild - Guild ID
 * @returns true if user should be added
 */
function shouldAddUserToThread(
	user: Djs.GuildMember,
	thread: Djs.ThreadChannel,
	guild: string
): boolean {
	const followOnlyRoleIn = db.settings.get(guild, "configuration.followOnlyRoleIn");
	const followOnlyRole = db.settings.get(guild, "configuration.followOnlyRole");

	// Early return for followOnlyRoleIn mode
	if (followOnlyRoleIn) return checkMemberRoleIn("follow", user.roles, thread);

	// Check if user is ignored
	if (checkMemberRole(user.roles, "ignore")) return false;

	// followOnlyRole mode
	if (followOnlyRole) return checkMemberRole(user.roles, "follow");

	// Default: add user if not ignored
	return true;
}

/**
 * Add a user to a thread, with verification the permission.
 * Check if the role is allowed by the settings for the thread.
 * @param thread {@link  Djs.ThreadChannel} The thread to add the user
 * @param user {@link  Djs.GuildMember} The user to add
 */
export async function addUserToThread(thread: Djs.ThreadChannel, user: Djs.GuildMember) {
	const guild = thread.guild.id;
	const ul = getTranslation(guild, { locale: thread.guild.preferredLocale });
	const emoji = db.getMessageToSend(guild);

	const hasPermission = thread.permissionsFor(user).has("ViewChannel", true);
	const isInThread = isUserInThread(thread, user);

	if (!hasPermission || isInThread) return;

	if (!shouldAddUserToThread(user, thread, guild)) return;

	try {
		const message = await fetchMessage(thread);
		await message.edit(`${Djs.userMention(user.id)} ${emoji}`);
		await discordLogs(
			guild,
			thread.client,
			`Add @${user.user.username} to #${thread.name}`
		);
	} catch (error) {
		console.error(error);
		if (error instanceof Djs.DiscordAPIError && error.code === 50001)
			await discordLogs(
				guild,
				thread.client,
				ul("error.missingPermission", { thread: thread.id })
			);
	}
}

/**
 * Add a list to user to a thread, with verification the permission. After, send a message to ping the user and remove it.
 * @param thread
 * @param members
 */
export function getUsersToPing(thread: Djs.ThreadChannel, members: Djs.GuildMember[]) {
	const guild = thread.guild.id;
	const usersToBeAdded: Djs.GuildMember[] = [];
	for (const member of members) {
		if (isUserInThread(thread, member)) continue;
		if (
			thread.permissionsFor(member).has("ViewChannel", true) &&
			shouldAddUserToThread(member, thread, guild)
		) {
			// Use centralised decision helper to avoid duplicated logic
			usersToBeAdded.push(member);
		}
	}
	return usersToBeAdded;
}

/**
 * Check if a role should be added to the thread based on guild configuration
 * @param role - Role to check
 * @param thread - Thread channel
 * @param guild - Guild ID
 * @returns true if role should be added
 */
function shouldAddRoleToThread(
	role: Djs.Role,
	thread: Djs.ThreadChannel,
	guild: string
): boolean {
	// Exclude @everyone explicitly
	if (role.name === "@everyone") return false;

	// If role is explicitly set to follow in this thread, allow
	if (checkRoleIn("follow", role, thread)) return true;

	// If followOnlyRoleIn is enabled, only roles marked in-thread as follow are allowed
	if (db.settings.get(guild, "configuration.followOnlyRoleIn")) return false;

	// If followOnlyRole is enabled, only roles marked as follow are allowed
	if (db.settings.get(guild, "configuration.followOnlyRole"))
		return checkRole(role, "follow");

	// Default: add role unless it's ignored globally or in-thread
	return !checkRole(role, "ignore") && !checkRoleIn("ignore", role, thread);
}

/**
 * Same as above, but for a role
 * @param thread
 * @param roles
 */
export async function getRoleToPing(thread: Djs.ThreadChannel, roles: Djs.Role[]) {
	const guild = thread.guild.id;
	const roleToBeAdded: Djs.Role[] = [];

	for (const role of roles) {
		//check if all members of the role are in the thread
		const membersInTheThread = thread.members.cache;
		const membersOfTheRoleNotInTheThread = role.members.filter(
			(member) => !membersInTheThread.has(member.id)
		);

		if (
			role.members.size > 0 &&
			membersOfTheRoleNotInTheThread.size > 0 &&
			thread.permissionsFor(role).has("ViewChannel", true)
		) {
			if (shouldAddRoleToThread(role, thread, guild)) {
				roleToBeAdded.push(role);
			}
		}
	}

	return roleToBeAdded;
}

/**
 * Add all members that have the permission to view the thread, first check by their role and after add the member that have overwrite permission
 * if there is no role in the server, check all members directly
 * @param thread {@link Djs.ThreadChannel} The thread to add the user
 * @param includeArchived
 */
export async function addRoleAndUserToThread(
	thread: Djs.ThreadChannel,
	includeArchived?: boolean
) {
	const members = thread.guild.members.cache;
	const toPing: Djs.GuildMember[] = [];
	const rolesWithAccess: Djs.Role[] = thread.guild.roles.cache.toJSON();
	if (rolesWithAccess.length > 0) {
		console.info("Getting roles to ping");
		try {
			const roles = await getRoleToPing(thread, rolesWithAccess);
			for (const role of roles) toPing.push(...role.members.toJSON());
		} catch (error) {
			console.error(error);
		}
	} else {
		const guildMembers: Djs.GuildMember[] = members.toJSON();
		const users = getUsersToPing(thread, guildMembers);
		toPing.push(...users);
	}
	//getConfig all member that have access to the thread (overwriting permission)
	//use cache
	const reloadMembers = thread.guild.members.cache;
	const memberWithAccess = getMemberPermission(reloadMembers, thread);
	if (memberWithAccess) {
		const memberWithAccessArray: Djs.GuildMember[] = memberWithAccess.toJSON();
		const users = getUsersToPing(thread, memberWithAccessArray);
		toPing.push(...users);
	}
	const emoji = db.getMessageToSend(thread.guild.id);
	//remove duplicates
	const uniqueToPingMap = new Map<string, Djs.GuildMember>();
	for (const member of toPing) uniqueToPingMap.set(member.id, member);

	const uniqueToPing = Array.from(uniqueToPingMap.values());
	console.info(`Total members to add: ${uniqueToPing.length}`);
	if (uniqueToPing.length > 0) {
		if (includeArchived && thread.archived)
			await thread.setArchived(false, "Adding members to thread");

		try {
			const message = await fetchMessage(thread);
			await splitAndSend(uniqueToPing, message);
			await message.edit(emoji);
			await discordLogs(
				thread.guild.id,
				thread.client,
				`Add ${uniqueToPing.length} members to #${thread.name}:\n- ${uniqueToPing.map((member) => member.user.username).join("\n- ")}`
			);
		} catch (error) {
			console.error(error);
			if (error instanceof Djs.DiscordAPIError && error.code === 50001) {
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

/**
 * Split user mentions into multiple messages to avoid Discord's 2000 character limit
 *
 * Calculation:
 * - User mention format: <@id>
 * - Length: 2(<@) + 18(id) + 1(>) = 21 characters
 * - For roles: 22 characters (includes &)
 * - Max message length: 2000 characters
 * - Max mentions per message: 2000 / 22 ≈ 90
 *
 * @param toPing - Array of guild members to mention
 * @param message - Message to edit with mentions
 */
async function splitAndSend(toPing: Djs.GuildMember[], message: Djs.Message) {
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
	const emoji = db.getMessageToSend(message.guild!.id);
	return await message.edit(emoji);
}

export async function fetchUntilMessage(
	thread: Djs.ThreadChannel
): Promise<Djs.Message | undefined | null> {
	const fetchMessage = await thread.messages.fetch({ limit: 100 });
	let find = fetchMessage.filter((m) => m.author.id === thread.client.user.id).first();
	// Return early if found
	if (find) return find;

	// Limit iterations to prevent infinite loops
	const maxIterations = 10;
	let iterations = 0;
	let previousLastMessageId: string | undefined;

	while (!find && fetchMessage.size > 0 && iterations < maxIterations) {
		iterations++;
		const lastMessageId = fetchMessage.last()?.id;
		// Break if no valid message ID or if we're stuck on the same message
		if (
			!lastMessageId ||
			(previousLastMessageId && lastMessageId === previousLastMessageId)
		)
			break;
		previousLastMessageId = lastMessageId;
		const moreMessages = await thread.messages.fetch({
			before: lastMessageId,
			limit: 100,
		});
		// Break if no new messages were fetched
		if (moreMessages.size === 0) break;
		find = moreMessages.find((m) => m.author.id === thread.client.user.id);
		// If found, return immediately
		if (find) return find;
	}
	return find ?? undefined;
}

async function fetchAllPinnedMessages(
	thread: Djs.ThreadChannel
): Promise<Djs.Message | undefined> {
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
		if (
			!lastMessageId ||
			(previousLastMessageId && lastMessageId === previousLastMessageId)
		)
			break;

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
	thread: Djs.ThreadChannel
): Promise<Djs.Message | undefined | null> {
	const pin = db.settings.get(thread.guild.id, "configuration.pin");
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

async function sendAndPin(thread: Djs.ThreadChannel): Promise<Djs.Message> {
	const toPin = db.settings.get(thread.guild.id, "configuration.pin");
	const messageToSend = db.getMessageToSend(thread.guild.id);
	const message = await thread.send({
		content: messageToSend,
		flags: Djs.MessageFlags.SuppressNotifications,
	});
	if (toPin) {
		try {
			await message.pin();
		} catch {
			//continue we should be able to continue even if pin fails as it is not critical
		}
	}

	return message;
}

async function fetchMessage(thread: Djs.ThreadChannel): Promise<Djs.Message> {
	const guildId = thread.guild.id;
	// Try cache first
	const cachedId = db.settings.get(guildId, `messageCache.${thread.id}`);
	if (cachedId) {
		try {
			const message = await thread.messages.fetch(cachedId);
			// Verify pin status
			const shouldBePinned = db.settings.get(guildId, "configuration.pin");
			if (shouldBePinned && !message.pinned) await message.pin();
			return message;
		} catch (e) {
			//only pin error can allow to continue, other should delete the cached message
			if (e instanceof Djs.DiscordAPIError && e.code !== 30003)
				db.settings.delete(guildId, `messageCache.${thread.id}`);
		}
	}

	// Fallback to fetching
	const firstMessage = await fetchFirstMessage(thread);
	const shouldBePinned = db.settings.get(guildId, "configuration.pin");
	if (shouldBePinned && firstMessage && !firstMessage.pinned) {
		try {
			await firstMessage.pin();
		} catch {
			//continue we should be able to continue even if pin fails as it is not critical
		}
	}

	const message = firstMessage ?? (await sendAndPin(thread));

	// Cache the result
	db.settings.set(guildId, message.id, `messageCache.${thread.id}`);
	return message;
}
