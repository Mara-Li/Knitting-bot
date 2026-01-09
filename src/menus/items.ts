import { getMaps, getRole } from "../maps";
import type { CommandMode, TrackedItems } from "./interfaces";

/**
 * Get all tracked items (followed or ignored) for a guild
 * @param mode The command mode: "follow" or "ignore"
 * @param guildID The guild ID
 * @returns Object containing all tracked item IDs organized by type
 */
export function getTrackedItems(mode: CommandMode, guildID: string): TrackedItems {
	const categories = getMaps(mode, "category", guildID);
	const channels = getMaps(mode, "channel", guildID);
	const threads = getMaps(mode, "thread", guildID);
	const forums = getMaps(mode, "forum", guildID);
	const roles = getRole(mode, guildID);

	return {
		categories,
		channels,
		forums,
		roles,
		threads,
	};
}
