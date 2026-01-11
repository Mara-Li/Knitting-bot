import {
	type AnyThreadChannel,
	ChannelType,
	type Client,
	Collection,
	type Guild,
	type TextThreadChannel,
} from "discord.js";
import db from "../database";
import { addRoleAndUserToThread } from "./add";
import { runWithConcurrency } from "./concurrency";
import { checkThread } from "./data_check";

/**
 * Send logs to the configured Discord channel
 * @param guildID - Guild identifier
 * @param bot - Discord client
 * @param text - Log messages to send
 */
export async function discordLogs(guildID: string, bot: Client, ...text: unknown[]) {
	const channelId = db.settings.get(guildID, "configuration.log");
	if (!channelId || typeof channelId !== "string") return;
	try {
		const channel = await bot.channels.fetch(channelId);
		if (channel && "send" in channel && typeof channel.send === "function") {
			const formatted = text
				.map((t) => (typeof t === "string" ? t : JSON.stringify(t)))
				.join(" ");
			await channel.send(`\`\`\`\n${formatted}\n\`\`\``);
		}
	} catch (error) {
		console.warn("Failed to send log message:", error);
	}
}

/**
 * Cooldown period in milliseconds to prevent duplicate cache updates
 */
const CACHE_UPDATE_COOLDOWN = 5000; // 5 seconds

/**
 * Map to keep track of in-flight member fetch promises per guild.
 * This prevents concurrent duplicate member fetches that can trigger opcode 8 rate limits.
 */
const inFlightMemberFetches = new Map<string, Promise<void>>();

/**
 * Update guild cache by fetching members and roles
 * @param guild - Guild to update
 * @param force - Force update even if within cooldown period
 */
export async function updateCache(guild: Guild, force = false) {
	const now = Date.now();
	const last = db.cacheUpdateTimestamps.get(guild.id)?.lastUpdate;

	// Skip if recently updated (within cooldown period) and not forced
	if (!force && last && now - last < CACHE_UPDATE_COOLDOWN) {
		return;
	}

	// If a fetch is already in progress for this guild, reuse the same promise
	if (inFlightMemberFetches.has(guild.id)) {
		return inFlightMemberFetches.get(guild.id);
	}

	const p = (async () => {
		try {
			await Promise.all([guild.members.fetch(), guild.roles.fetch()]);
			db.cacheUpdateTimestamps.set(guild.id, { lastUpdate: now });
		} catch (e) {
			console.log(e);
			// Ignore error
		} finally {
			inFlightMemberFetches.delete(guild.id);
		}
	})();

	inFlightMemberFetches.set(guild.id, p);
	return p;
}

/**
 * Fetch all archived threads from a guild
 * @param guild - Guild to fetch archived threads from
 * @returns Array of archived threads
 */
export async function fetchArchived(guild: Guild): Promise<AnyThreadChannel[]> {
	// Collect text channels and forum channels
	const parents = guild.channels.cache.filter(
		(c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildForum
	);

	// Fetch public archived threads
	const publicTasks: Array<() => Promise<unknown>> = parents.map((channel) => {
		return async () =>
			channel.threads.fetchArchived({ fetchAll: true, type: "public" }).catch(() => {
				return {
					threads: new Collection<string, AnyThreadChannel>(),
				};
			});
	});

	const publicResults = await runWithConcurrency(publicTasks, 3);

	// Fetch private archived threads (requires proper permissions)
	const privateTasks: Array<() => Promise<unknown>> = parents.map((channel) => {
		return async () =>
			channel.threads.fetchArchived({ fetchAll: true, type: "private" }).catch(() => {
				return {
					threads: new Collection<string, AnyThreadChannel>(),
				};
			});
	});

	const privateResults = await runWithConcurrency(privateTasks, 3);

	const threads: Map<string, AnyThreadChannel> = new Map();

	// biome-ignore lint/suspicious/noExplicitAny: we want to use any here
	const collect = (results: PromiseSettledResult<any>[]) => {
		for (const result of results) {
			if (result.status === "fulfilled") {
				const threadsCollection = result.value?.threads as
					| Collection<string, AnyThreadChannel>
					| undefined;
				if (!threadsCollection) continue;
				for (const thr of threadsCollection.values()) {
					threads.set(thr.id, thr);
				}
			}
		}
	};

	collect(publicResults);
	collect(privateResults);

	return Array.from(threads.values());
}

export async function getCommandId(commandName: string, guild: Guild) {
	const cmdsId = await guild.commands.fetch();
	const command = cmdsId.find((cmd) => cmd.name === commandName);
	return command?.id;
}

/**
 * Resolve channel IDs to channel objects, fetching from API when not in cache.
 * Filters by allowed channel types.
 */
export async function resolveChannelsByIds<T extends { type: number }>(
	guild: Guild,
	ids: string[],
	allowedTypes: number[]
): Promise<T[]> {
	const resolved: T[] = [];
	const idSet = new Set(ids);

	// First, try to get from cache and direct fetch
	for (const id of ids) {
		const ch = guild.channels.cache.get(id) as unknown as T | undefined;
		if (ch && allowedTypes.includes((ch as unknown as { type: number }).type)) {
			resolved.push(ch);
			idSet.delete(id);
		}
	}

	if (idSet.size > 0) {
		const tasks: Array<() => Promise<unknown>> = Array.from(idSet).map((id) => {
			return async () => guild.channels.fetch(id).catch(() => null);
		});
		const results = await runWithConcurrency(tasks, 5);
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			if (r.status === "fulfilled" && r.value) {
				const ch = r.value as unknown as T;
				if (allowedTypes.includes((ch as unknown as { type: number }).type)) {
					resolved.push(ch);
					idSet.delete((ch as unknown as { id: string }).id);
				}
			}
		}

		// If still missing and we need threads, fetch from archived
		if (
			idSet.size > 0 &&
			(allowedTypes.includes(ChannelType.PublicThread) ||
				allowedTypes.includes(ChannelType.PrivateThread))
		) {
			try {
				const archivedThreads = await fetchArchived(guild);
				for (const thread of archivedThreads) {
					if (idSet.has(thread.id)) {
						resolved.push(thread as unknown as T);
						idSet.delete(thread.id);
					}
				}
			} catch (e) {
				// Skip & continue
			}
		}
	}

	return resolved;
}

export async function updateThread(
	followOnlyChannelEnabled: boolean,
	thread: TextThreadChannel
) {
	const shouldUpdate = followOnlyChannelEnabled
		? checkThread(thread, "follow")
		: !checkThread(thread, "ignore");

	if (shouldUpdate) {
		try {
			await addRoleAndUserToThread(thread);
		} catch (error) {
			console.warn(`[Channel Update] Failed to update thread ${thread.id}`, error);
		}
	}
}
