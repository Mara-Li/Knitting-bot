import {
	type AnyThreadChannel,
	ChannelType,
	type Client,
	Collection,
	type Guild,
} from "discord.js";
import { serverDataDb } from "../maps";

/**
 * Send logs to the configured Discord channel
 * @param guildID - Guild identifier
 * @param bot - Discord client
 * @param text - Log messages to send
 */
export async function discordLogs(guildID: string, bot: Client, ...text: unknown[]) {
	const channelId = serverDataDb.get(guildID, "configuration")?.log;
	if (!channelId || typeof channelId !== "string") return;

	try {
		const channel = await bot.channels.fetch(channelId);
		if (channel && "send" in channel && typeof channel.send === "function") {
			await channel.send(`\`\`\`\n${text.join(" ")}\n\`\`\``);
		}
	} catch (error) {
		console.error("Failed to send log message:", error);
	}
}

/**
 * Update guild cache by fetching members and roles
 * @param guild - Guild to update
 */
export async function updateCache(guild: Guild) {
	try {
		await Promise.all([guild.members.fetch(), guild.roles.fetch()]);
	} catch (e) {
		console.log(e);
		// Ignore error
	}
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
	const publicResults = await Promise.allSettled(
		parents.map((channel) =>
			channel.threads.fetchArchived({ fetchAll: true, type: "public" }).catch(() => {
				// ignore per-channel errors
				return { threads: new Collection<string, AnyThreadChannel>() } as unknown as {
					threads: Collection<string, AnyThreadChannel>;
				};
			})
		)
	);

	// Fetch private archived threads (requires proper permissions)
	const privateResults = await Promise.allSettled(
		parents.map((channel) =>
			channel.threads.fetchArchived({ fetchAll: true, type: "private" }).catch(() => {
				return { threads: new Collection<string, AnyThreadChannel>() } as unknown as {
					threads: Collection<string, AnyThreadChannel>;
				};
			})
		)
	);

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
	const toFetch: string[] = [];

	for (const id of ids) {
		const ch = guild.channels.cache.get(id) as unknown as T | undefined;
		if (ch && allowedTypes.includes((ch as unknown as { type: number }).type)) {
			resolved.push(ch);
		} else {
			toFetch.push(id);
		}
	}

	if (toFetch.length > 0) {
		const results = await Promise.allSettled(
			toFetch.map((id) => guild.channels.fetch(id).catch(() => null))
		);
		for (const r of results) {
			if (r.status === "fulfilled" && r.value) {
				const ch = r.value as unknown as T;
				if (allowedTypes.includes((ch as unknown as { type: number }).type)) {
					resolved.push(ch);
				}
			}
		}

		// Pour les threads qui n'ont pas pu être récupérés, chercher dans tous les canaux
		const stillMissing = toFetch.filter(
			// biome-ignore lint/suspicious/noExplicitAny: we want to use any here
			(id) => !resolved.some((ch: any) => ch.id === id)
		);

		if (stillMissing.length > 0 && allowedTypes.includes(ChannelType.PublicThread)) {
			for (const channel of guild.channels.cache.values()) {
				if (
					channel.type === ChannelType.GuildText ||
					channel.type === ChannelType.GuildForum
				) {
					try {
						const threads = await channel.threads.fetchArchived({
							limit: 100,
						});
						for (const thread of threads.threads.values()) {
							const idx = stillMissing.indexOf(thread.id);
							if (idx !== -1) {
								resolved.push(thread as unknown as T);
								stillMissing.splice(idx, 1);
							}
						}
						if (stillMissing.length === 0) break;
					} catch (e) {
						// Continuer si l'accès aux threads archivés échoue
					}
				}
			}
		}
	}

	return resolved;
}
