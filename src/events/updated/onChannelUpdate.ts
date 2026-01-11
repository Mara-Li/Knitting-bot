import { ChannelType, type Client, type TextChannel } from "discord.js";
import db from "../../database";
import { getTranslation } from "../../i18n";
import { discordLogs, updateCache, updateThread } from "../../utils";
import { runWithConcurrency } from "../../utils/concurrency";
import { validateChannelType } from "../../utils/data_check";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for channel update event.
 * When the permission of a channel is updated, check if the channel have thread and update them.
 */

export default (client: Client): void => {
	client.on("channelUpdate", async (oldChannel, newChannel) => {
		if (
			oldChannel.type === ChannelType.DM ||
			newChannel.type === ChannelType.DM ||
			!oldChannel.guild
		)
			return;
		const guildId = oldChannel.guild.id;

		const ul = getTranslation(guildId, {
			locale: newChannel.guild.preferredLocale,
		});
		if (!db.settings.get(guildId, "configuration.onChannelUpdate")) return;
		if (
			!validateChannelType(oldChannel) ||
			!validateChannelType(newChannel) ||
			oldChannel.permissionOverwrites.cache === newChannel.permissionOverwrites.cache
		) {
			return;
		}
		await updateCache(newChannel.guild);
		const followOnlyChannelEnabled =
			db.settings.get(guildId, "configuration.followOnlyChannel") ??
			db.defaultValues.configuration.followOnlyChannel;
		const isCategory = newChannel.type === ChannelType.GuildCategory;

		if (isCategory) {
			//get all threads of the channels in the category
			const children = newChannel.children.cache;
			if (children.size === 0) return;
			let totalThreads = 0;
			const childrenWithThreads: string[] = [];
			const tasks: Array<() => Promise<unknown>> = [];
			for (const child of children.values()) {
				if (child.type === ChannelType.GuildText) {
					const threads = (child as TextChannel).threads.cache;
					if (threads.size > 0) {
						totalThreads += threads.size;
						childrenWithThreads.push(`<#${child.id}>`);
					}
					// Collect tasks instead of awaiting per child
					for (const thread of threads.values()) {
						tasks.push(async () => updateThread(followOnlyChannelEnabled, thread));
					}
				}
			}
			if (tasks.length > 0) await runWithConcurrency(tasks, 10);

			if (totalThreads > 0) {
				await discordLogs(
					guildId,
					client,
					ul("logs.channelUpdate.category", {
						channelList: `\n- ${childrenWithThreads.join("\n- ")}`,
						nb: totalThreads,
						nbChan: childrenWithThreads.length,
					})
				);
			}
		} else {
			const newTextChannel = newChannel as TextChannel;
			const threads = newTextChannel.threads.cache;
			if (threads.size === 0) return;
			const tasks = Array.from(threads.values()).map((thread) => {
				return async () => updateThread(followOnlyChannelEnabled, thread);
			});
			await runWithConcurrency(tasks, 3);
		}
	});
};
