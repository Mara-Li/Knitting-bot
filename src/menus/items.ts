import db from "../database";
import type { CommandMode, TrackedItems } from "../interfaces";

/**
 * Get all tracked items (followed or ignored) for a guild
 * @param mode The command mode: "follow" or "ignore"
 * @param guildID The guild ID
 * @returns Object containing all tracked item IDs organized by type
 */
export function getTrackedItems(mode: CommandMode, guildID: string): TrackedItems {
	const categories = db.getMaps(mode, "category", guildID);
	const channels = db.getMaps(mode, "channel", guildID);
	const threads = db.getMaps(mode, "thread", guildID);
	const forums = db.getMaps(mode, "forum", guildID);
	const roles: string[] = db.settings.get(guildID, `${mode}.role`) ?? [];

	return {
		categories,
		channels,
		forums,
		roles,
		threads,
	};
}
