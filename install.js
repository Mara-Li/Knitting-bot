/**
 * @fileoverview This file is used to install the bot to a server.
 * @version 1.0.0
 * It will create a new file called .env and will ask for the bot token.
 */

const readlineSync = require("readline-sync");
const c = require("ansi-colors");

const lang = Intl.DateTimeFormat().resolvedOptions().locale;

const translation = {
	"en-US": {
		token: "Discord BOT TOKEN: ",
		clientId: "Discord Bot Client ID: ",
		env: {
			question: "Is it a development environment? ",
			dev: "Development",
			prod: "Production",
		},
		emoji: {
			desc: "(Message/emoji/symbol to send when loading): ",
			title: "Message ",
		},
		log: {
			env: "Environment: ",
			clientId: "Client ID: ",
			token: "Token: ",
			message: "Message: ",
		}
	},
	"fr-FR": {
		token: "Token du BOT Discord : ",
		clientId: "ID du client du BOT Discord : ",
		env: {
			question: "Est-ce un environnement de développement ? ",
			dev: "Développement",
			prod: "Production",
		},
		emoji: {
			desc: "(Message/emoji/symbole à envoyer lors du chargement) : ",
			title: "Message ",
		},
		log: {
			env: "Environnement : ",
			clientId: "ID Client : ",
			token: "Token : ",
			message: "Message : ",
		}
	}
};



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

const t = translation[lang];

let token = readlineSync.question(c.info(t.token));
let clientId = readlineSync.question(c.info(t.clientId));
let isDevEnv = readlineSync.keyInYNStrict(c.info(t.env.question));
let emoji = readlineSync.question(c.info(t.emoji.title) + c.muted(t.emoji.desc));


const nodeEnv = isDevEnv ? "development" : "production";
const nodeEnvTrad = isDevEnv ? t.env.dev : t.env.prod;

const tlog = translation[lang].log;
console.log("");
console.log(c.success(tlog.token + token));
console.log(c.success(tlog.clientId + clientId));
console.log(c.success(tlog.env + nodeEnvTrad));
console.log(c.success(tlog.message + emoji));

const envContent = `DISCORD_TOKEN=${token.trim()}\nCLIENT_ID=${clientId.trim()}\nNODE_ENV=${nodeEnv.trim()}\nMESSAGE=${emoji}`;

require("fs").writeFileSync(".env", envContent);
