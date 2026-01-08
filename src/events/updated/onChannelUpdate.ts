import { ChannelType, type Client, type TextChannel } from "discord.js";
import { getTranslation } from "../../i18n";
import { getConfig } from "../../maps";
import { discordLogs, updateCache, updateThread } from "../../utils";
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
		if (!getConfig("onChannelUpdate", guildId)) return;
		if (
			!validateChannelType(oldChannel) ||
			!validateChannelType(newChannel) ||
			oldChannel.permissionOverwrites.cache === newChannel.permissionOverwrites.cache
		) {
			return;
		}
		await updateCache(newChannel.guild);
		const followOnlyChannelEnabled = getConfig("followOnlyChannel", guildId);
		const isCategory = newChannel.type === ChannelType.GuildCategory;

		if (isCategory) {
			//get all threads of the channels in the category
			const children = newChannel.children.cache;
			if (children.size === 0) return;
			let totalThreads = 0;
			const childrenWithThreads: string[] = [];
			const threadUpdatePromises: Promise<unknown>[] = [];
			for (const child of children.values()) {
				if (child.type === ChannelType.GuildText) {
					const threads = (child as TextChannel).threads.cache;
					if (threads.size > 0) {
						totalThreads += threads.size;
						childrenWithThreads.push(`<#${child.id}>`);
					}
					// Collect promises instead of awaiting per child
					for (const thread of threads.values()) {
						threadUpdatePromises.push(updateThread(followOnlyChannelEnabled, thread));
					}
				}
			}
			if (threadUpdatePromises.length > 0) {
				await Promise.allSettled(threadUpdatePromises);
			}
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
			await Promise.allSettled(
				threads.map((thread) => updateThread(followOnlyChannelEnabled, thread))
			);
		}
	});
};
