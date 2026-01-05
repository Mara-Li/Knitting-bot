import fs from "node:fs";
import Enmap from "enmap";

const config = new Enmap({ name: "Configuration" });
const ignore = new Enmap({ name: "Ignore" });
const follow = new Enmap({ name: "FollowOnly" });
const cache = new Enmap({ name: "BotMessageCache" });

const maps = [
	{ filename: "./_migration/files/export_config.json", map: config },
	{ filename: "./_migration/files/export_ignore.json", map: ignore },
	{ filename: "./_migration/files/export_follow.json", map: follow },
	{ filename: "./_migration/files/export_cache.json", map: cache },
];

maps.forEach(({ map, filename }) => {
	fs.readFile(filename, "utf8", (err, data) => {
		if (err) {
			console.error(`Error reading file ${filename}:`, err);
			return;
		}
		map.import(data, true, true);
	});
});