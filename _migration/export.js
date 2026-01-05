import fs from "node:fs";
import Enmap from "enmap";

const config = new Enmap({ name: "Configuration" });
const ignore = new Enmap({ name: "Ignore" });
const follow = new Enmap({ name: "FollowOnly" });
const cache = new Enmap({ name: "BotMessageCache" });

const maps = [
	{ filename: "./migrate/export_config.json", map: config },
	{ filename: "./migrate/export_ignore.json", map: ignore },
	{ filename: "./migrate/export_follow.json", map: follow },
	{ filename: "./migrate/export_cache.json", map: cache },
];

maps.forEach(({ map, filename }) => {
	fs.writeFile(filename, map.export(), () => {
		// I hope the data was in fact saved, because we're deleting it! Double-check your backup file size.
		map.clear();
	});
});
