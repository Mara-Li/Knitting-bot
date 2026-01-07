import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Enmap from "enmap";
import { runMigration } from "./migrate_v2";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseFolder = path.join(dirname, "../data");

const database = new Enmap({
	dataDir: databaseFolder,
	name: "Database",
});

const exportPath = path.join(dirname, "files", "export_database.json");

if (!fs.existsSync(path.dirname(exportPath))) {
	fs.mkdirSync(path.dirname(exportPath), { recursive: true });
}

function exportDatabase() {
	fs.writeFileSync(exportPath, database.export(), "utf-8");
	console.log(`Database exported to ${exportPath}`);
}

function importDatabase() {
	const data = fs.readFileSync(exportPath, "utf-8");
	database.import(data);
	console.log("Database imported successfully.");
}

function verifyEnmapVersion() {
	const require = createRequire(import.meta.url);
	const enmapPackage = require("enmap/package.json");
	const version = enmapPackage.version;

	console.log(`Current Enmap version: ${version}`);
	return version;
}

function backupDatabaseFolder() {
	//rename the existing database folder
	const backupFolder = `${databaseFolder}_backup_${Date.now()}`;
	fs.renameSync(databaseFolder, backupFolder);
	console.log(`Database folder backed up to: ${backupFolder}`);
}

async function migrate() {
	const enmapVersion = verifyEnmapVersion();
	if (enmapVersion.startsWith("5.")) {
		console.log("1. Migrating to the new Database system...");
		await runMigration();
		console.log("2. Exporting the Database to JSON file...");
		exportDatabase();
		console.log("3. Backing up the existing database folder...");
		backupDatabaseFolder();
		console.warn("Please update Enmap to version 6.x before importing the database.");
		return;
	}
	//verify that the import file exists
	if (!fs.existsSync(exportPath)) {
		console.error(
			`Import file not found at ${exportPath}. Please ensure the export file exists before importing.`
		);
		return;
	}
	console.log("4. Importing the Database from JSON file...");
	importDatabase();
	console.log("Migration completed.");
}

migrate().then(
	() => {
		console.log("Migration process finished.");
	},
	(err) => {
		console.error("Migration process failed:", err);
	}
);
