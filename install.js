/**
 * @fileoverview This file is used to install the bot to a server.
 * @version 1.0.0
 * It will create a new file called .env and will ask for the bot token.
 */

const readlineSync = require("readline-sync");
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

let token = readlineSync.question(c.info("Discord BOT TOKEN: "));
let clientId = readlineSync.question(c.info("Discord Bot Client ID: "));
let isDevEnv = readlineSync.keyInYNStrict(c.info("Is this a development environment?"));

const nodeEnv = isDevEnv ? "development" : "production";

console.log(c.success("Token: " + token));
console.log(c.success("Client ID: " + clientId));
console.log(c.success("Environment: " + nodeEnv));

const envContent = `DISCORD_TOKEN=${token}\nCLIENT_ID=${clientId}\nNODE_ENV=${nodeEnv}`;

require("fs").writeFileSync(".env", envContent);
