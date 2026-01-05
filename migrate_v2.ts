/**
 * Migration Script: v1 (multiple Enmaps) -> v2 (unified ServerData Enmap)
 *
 * This script migrates data from the old Enmap structure to the new unified ServerData structure.
 * Old structure: separate optionMaps, ignoreMaps, followOnlyMaps
 * New structure: single serverDataDb with ServerData interface
 *
 * Usage: Run this script BEFORE deploying the new version
 * It will backup old data and create new data structure safely
 */

import Enmap from "enmap";
import type { Configuration, IgnoreFollow, ServerData } from "./src/interface";
import { DEFAULT_CONFIGURATION, DEFAULT_IGNORE_FOLLOW } from "./src/interface";

// Old Enmaps (v1)
const oldOptionMaps = new Enmap<string, Configuration>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Configuration",
});

const oldIgnoreMaps = new Enmap<string, IgnoreFollow>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Ignore",
});

const oldFollowOnlyMaps = new Enmap<string, IgnoreFollow>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "FollowOnly",
});

const oldBotMessageCache = new Enmap<string, Record<string, string>>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "BotMessageCache",
});

// New Enmap (v2)
const newServerDataDb = new Enmap<string, ServerData>({
	autoFetch: true,
	cloneLevel: "deep",
	fetchAll: false,
	name: "Database",
});

/**
 * Backup old data before migration
 */
function backupOldData(): void {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupFile = `_migration/bak/backup_${timestamp}.json`;

	const backup = {
		botMessageCache: oldBotMessageCache.export(),
		followOnlyMaps: oldFollowOnlyMaps.export(),
		ignoreMaps: oldIgnoreMaps.export(),
		optionMaps: oldOptionMaps.export(),
		timestamp,
	};

	console.log(`✓ Backup created at ${backupFile}`);
	console.log(`  - Configuration entries: ${Object.keys(backup.optionMaps).length}`);
	console.log(`  - Ignore entries: ${Object.keys(backup.ignoreMaps).length}`);
	console.log(`  - Follow entries: ${Object.keys(backup.followOnlyMaps).length}`);
	console.log(`  - Message cache entries: ${Object.keys(backup.botMessageCache).length}`);
}

/**
 * Migrate data from old structure to new unified structure
 */
function migrateData(): void {
	const allGuildIds = new Set<string>();

	// Collect all guild IDs from all old maps
	oldOptionMaps.forEach((_, guildId) => {
		allGuildIds.add(guildId);
	});
	oldIgnoreMaps.forEach((_, guildId) => {
		allGuildIds.add(guildId);
	});
	oldFollowOnlyMaps.forEach((_, guildId) => {
		allGuildIds.add(guildId);
	});
	oldBotMessageCache.forEach((_, guildId) => {
		allGuildIds.add(guildId);
	});

	if (allGuildIds.size === 0) {
		console.log("✓ No data found in old Enmaps - nothing to migrate");
		return;
	}

	console.log(`\nMigrating data for ${allGuildIds.size} guild(s)...`);

	let successCount = 0;
	const errors: string[] = [];

	for (const guildId of allGuildIds) {
		try {
			const configuration = oldOptionMaps.get(guildId) ?? DEFAULT_CONFIGURATION;
			const ignore = oldIgnoreMaps.get(guildId) ?? DEFAULT_IGNORE_FOLLOW;
			const follow = oldFollowOnlyMaps.get(guildId) ?? DEFAULT_IGNORE_FOLLOW;

			// Get message cache for this guild
			const guildMessageCache = oldBotMessageCache.get(guildId) ?? {};

			// Create new ServerData structure
			const serverData: ServerData = {
				configuration: { ...DEFAULT_CONFIGURATION, ...configuration },
				follow: { ...DEFAULT_IGNORE_FOLLOW, ...follow },
				ignore: { ...DEFAULT_IGNORE_FOLLOW, ...ignore },
				messageCache: guildMessageCache,
			};

			// Save to new Enmap
			newServerDataDb.set(guildId, serverData);
			successCount++;
		} catch (error) {
			errors.push(
				`Guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	console.log(`✓ Migrated ${successCount}/${allGuildIds.size} guilds successfully`);

	if (errors.length > 0) {
		console.error("\n⚠ Errors during migration:");
		errors.forEach((err) => {
			console.error(`  - ${err}`);
		});
	}
}

/**
 * Verify migration was successful
 */
function verifyMigration(): void {
	console.log("\nVerifying migration...");

	let totalGuilds = 0;
	let validEntries = 0;

	newServerDataDb.forEach((serverData, guildId) => {
		totalGuilds++;
		const isValid =
			serverData.configuration &&
			serverData.ignore &&
			serverData.follow &&
			serverData.messageCache !== undefined;

		if (isValid) {
			validEntries++;
		} else {
			console.error(`⚠ Invalid entry for guild ${guildId}`);
		}
	});

	console.log(`✓ Verification complete: ${validEntries}/${totalGuilds} valid entries`);

	if (validEntries === totalGuilds && totalGuilds > 0) {
		console.log("✓ Migration verified successfully!");
	}
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
	console.log("╔════════════════════════════════════════╗");
	console.log("║  Knitting-bot Data Migration v1 → v2   ║");
	console.log("╚════════════════════════════════════════╝\n");

	try {
		// Step 1: Backup
		console.log("Step 1: Backing up old data...");
		backupOldData();

		// Step 2: Migrate
		console.log("\nStep 2: Migrating to new structure...");
		migrateData();

		// Step 3: Verify
		verifyMigration();

		console.log("\n✓ Migration completed successfully!");
		console.log(
			"\nNext steps:\n" +
				"  1. Test the bot with the new data structure\n" +
				"  2. Verify all guild configurations are correct\n" +
				"  3. Once confirmed working, you can safely delete old Enmaps\n" +
				"     (Configuration, Ignore, FollowOnly, BotMessageCache)\n"
		);
	} catch (error) {
		console.error("\n✗ Migration failed:");
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// Run migration
runMigration().catch((error) => {
	console.error("Unexpected error:", error);
	process.exit(1);
});
