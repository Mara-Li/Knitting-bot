import { TypeName } from "../interface";
import { getMaps, getRole } from "../maps";

export type CommandMode = "follow" | "ignore";

export interface TrackedItems {
	categories: string[];
	channels: string[];
	forums: string[];
	roles: string[];
	threads: string[];
}

/**
 * Get all tracked items (followed or ignored) for a guild
 * @param mode The command mode: "follow" or "ignore"
 * @param guildID The guild ID
 * @returns Object containing all tracked item IDs organized by type
 */
export function getTrackedItems(mode: CommandMode, guildID: string): TrackedItems {
	console.log(`[getTrackedItems] Called with mode="${mode}", guildID="${guildID}"`);
	const categories = getMaps(mode, TypeName.category, guildID);
	const channels = getMaps(mode, TypeName.channel, guildID);
	const threads = getMaps(mode, TypeName.thread, guildID);
	const forums = getMaps(mode, TypeName.forum, guildID);
	const roles = getRole(mode, guildID);

	console.log(`[getTrackedItems] Results for mode="${mode}":`, {
		categories: categories.length,
		channels: channels.length,
		forums: forums.length,
		roles: roles.length,
		threads: threads.length,
	});

	return {
		categories,
		channels,
		forums,
		roles,
		threads,
	};
}
