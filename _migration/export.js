import fs from "node:fs";
import path from "node:path";
import Enmap from "enmap";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseFolder = path.join(dirname, "../data");

const database = new Enmap({
	name: "Database",
	dataDir: databaseFolder,
});

const exportPath = path.join(dirname, "files", "export_database.json");

fs.writeFile(exportPath, database.export(), (err) => {
	if (err) {
		console.error("Error exporting database:", err);
		return;
	}
});

console.log(`Database exported to ${exportPath}`);
