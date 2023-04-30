/**
 * @fileoverview This file is used to install the bot to a server.
 * @version 1.0.0
 * It will create a new file called .env and will ask for the bot token.
 */

const fs = require("fs");
const readline = require("readline");
const c = require("ansi-colors");

c.theme({
	danger: c.red,
	dark: c.dim.gray,
	disabled: c.gray,
	em: c.italic,
	heading: c.bold.underline,
	info: c.cyan,
	muted: c.dim,
	primary: c.blue,
	strong: c.bold,
	success: c.green,
	underline: c.underline,
	warning: c.yellow
});

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question(c.info("Enter the discord bot token: "), (token) => {
	fs.writeFileSync(".env", `DISCORD_TOKEN=${token}\n`, { flag: "w" });
	rl.close();
});
