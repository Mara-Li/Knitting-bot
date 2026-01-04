import type {
	CategoryChannel,
	ForumChannel,
	Role,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { TypeName } from "../interface";
import { getMaps, getRole } from "../maps";

export type CommandMode = "follow" | "ignore";

export interface TrackedItems {
	categories: CategoryChannel[];
	channels: TextChannel[];
	forums: ForumChannel[];
	roles: Role[];
	threads: ThreadChannel[];
}

/**
 * Get all tracked items (followed or ignored) for a guild
 * @param mode The command mode: "follow" or "ignore"
 * @param guildID The guild ID
 * @returns Object containing all tracked items organized by type
 */
export function getTrackedItems(mode: CommandMode, guildID: string): TrackedItems {
	const categories =
		(getMaps(mode, TypeName.category, guildID) as CategoryChannel[]) ?? [];
	const channels = (getMaps(mode, TypeName.channel, guildID) as TextChannel[]) ?? [];
	const threads = (getMaps(mode, TypeName.thread, guildID) as ThreadChannel[]) ?? [];
	const forums = (getMaps(mode, TypeName.forum, guildID) as ForumChannel[]) ?? [];
	const roles = (getRole(mode, guildID) as Role[]) ?? [];

	return {
		categories,
		channels,
		forums,
		roles,
		threads,
	};
}
