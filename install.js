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
		"GITHUB_EMOJI" : "ID's Emoji representing the GitHub logo: ",
		"KOFI" : "ID's Emoji representing the Kofi logo: ",
		"DISCORD" : "ID's Emoji representing the Discord logo: ",
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
			"github": "GitHub ID Emoji: ",
			"kofi": "Kofi ID Emoji: ",
			"discord": "Discord ID Emoji: ",
		}
	},
	"fr-FR": {
		token: "Token du BOT Discord : ",
		clientId: "ID du client du BOT Discord : ",
		"GITHUB_EMOJI" : "ID de l'Emoji représentant le logo GitHub : ",
		"KOFI" : "ID de l'Emoji représentant le logo Kofi : ",
		"DISCORD" : "ID de l'Emoji représentant le logo Discord : ",
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
			"github": "ID Emoji GitHub : ",
			"kofi": "ID Emoji Kofi : ",
			"discord": "ID Emoji Discord : ",
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
let githubEmoji = readlineSync.question(c.info(t.GITHUB_EMOJI));
let kofiEmoji = readlineSync.question(c.info(t.KOFI));
let discordEmoji = readlineSync.question(c.info(t.DISCORD));


const nodeEnv = isDevEnv ? "development" : "production";
const nodeEnvTrad = isDevEnv ? t.env.dev : t.env.prod;

const tlog = translation[lang].log;
console.log("");
console.log(c.success(tlog.token + token));
console.log(c.success(tlog.clientId + clientId));
console.log(c.success(tlog.env + nodeEnvTrad));
console.log(c.success(tlog.message + emoji));
console.log(c.success(tlog.github + githubEmoji));
console.log(c.success(tlog.kofi + kofiEmoji));
console.log(c.success(tlog.discord + discordEmoji));

const envContent = `DISCORD_TOKEN=${token.trim()}\nCLIENT_ID=${clientId.trim()}\nNODE_ENV=${nodeEnv.trim()}\nMESSAGE=${emoji}\nGITHUB_EMOJI=${githubEmoji}\nKOFI=${kofiEmoji}\nDISCORD=${discordEmoji}`;

require("fs").writeFileSync(".env", envContent);
