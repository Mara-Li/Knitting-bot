import Enmap from "enmap";
import type { Configuration, IgnoreFollow, RoleIn } from "../interface";

// Old Enmap references (read-only for migration)
const oldConfigMap = new Enmap<string, Configuration>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Configuration",
});

const oldIgnoreMap = new Enmap<string, unknown>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Ignore",
});

const oldFollowOnlyMap = new Enmap<string, unknown>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "FollowOnly",
});

// New Enmap references
const newIgnoreMap = new Enmap<string, IgnoreFollow>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Ignore_v2",
});

const newFollowOnlyMap = new Enmap<string, IgnoreFollow>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "FollowOnly_v2",
});

/**
 * Convert old IgnoreFollow structure (with full objects) to new structure (with IDs)
 * @param oldData - Old IgnoreFollow data with full Discord.js objects
 * @returns New IgnoreFollow data with only IDs
 */
function convertIgnoreFollowToIds(oldData: unknown): IgnoreFollow {
	const newData: IgnoreFollow = {
		category: [],
		channel: [],
		forum: [],
		// biome-ignore lint/style/useNamingConvention: TypeName.OnlyRoleIn uses PascalCase
		OnlyRoleIn: [],
		role: [],
		thread: [],
	};

	// Type guard pour vérifier que oldData est un objet
	if (!oldData || typeof oldData !== "object") return newData;
	const data = oldData as Record<string, unknown>;

	// Convert threads
	if (Array.isArray(data.thread)) {
		newData.thread = data.thread
			.map((item: unknown) => (item as { id?: string })?.id || item)
			.filter(Boolean) as string[];
	}

	// Convert roles
	if (Array.isArray(data.role)) {
		newData.role = data.role
			.map((item: unknown) => (item as { id?: string })?.id || item)
			.filter(Boolean) as string[];
	}

	// Convert categories
	if (Array.isArray(data.category)) {
		newData.category = data.category
			.map((item: unknown) => (item as { id?: string })?.id || item)
			.filter(Boolean) as string[];
	}

	// Convert channels
	if (Array.isArray(data.channel)) {
		newData.channel = data.channel
			.map((item: unknown) => (item as { id?: string })?.id || item)
			.filter(Boolean) as string[];
	}

	// Convert forums
	if (Array.isArray(data.forum)) {
		newData.forum = data.forum
			.map((item: unknown) => (item as { id?: string })?.id || item)
			.filter(Boolean) as string[];
	}

	// Convert OnlyRoleIn
	if (Array.isArray(data.OnlyRoleIn)) {
		newData.OnlyRoleIn = data.OnlyRoleIn.map((roleIn: unknown) => {
			const roleData = roleIn as Record<string, unknown>;
			const converted: RoleIn = {
				channelIds: [],
				roleId: ((roleData.role as { id?: string })?.id ||
					roleData.roleId ||
					"") as string,
			};

			if (Array.isArray(roleData.channels)) {
				converted.channelIds = roleData.channels
					.map((ch: unknown) => (ch as { id?: string })?.id || ch)
					.filter(Boolean) as string[];
			} else if (Array.isArray(roleData.channelIds)) {
				converted.channelIds = roleData.channelIds.filter(Boolean) as string[];
			}

			return converted;
		}).filter((item: RoleIn) => item.roleId);
	}

	return newData;
}

/**
 * DEPRECATED: This migration is now handled by _migration/migrate_v2.ts
 * This file is kept for reference but should not be used.
 *
 * Use the external migration script instead:
 * npm run migration
 */

/**
 * @deprecated Use _migration/migrate_v2.ts instead
 */
export async function migrateDataToV2(): Promise<void> {
	console.warn("⚠️  This migration function is deprecated.");
	console.warn("⚠️  Please use the external migration script: _migration/migrate_v2.ts");
	console.warn("⚠️  Run with: npx tsx _migration/migrate_v2.ts");
}
