import process from "node:process";
import pkg from "../../package.json" with { type: "json" };
import dotenv from "dotenv";

dotenv.config({quiet: true});
export const EMOJI =
	process.env.MESSAGE && process.env.MESSAGE.trim().length > 0
		? process.env.MESSAGE
		: "_ _";
export const VERSION = pkg.version ?? "0.0.0";
export const DESTROY_DATABASE = process.env.DESTROY === "true";
export const INFO_EMOJI = {
	discord: process.env.DISCORD ?? "1125076859881791590",
	docs: process.env.DOCS ?? "📚",
	github: process.env.GITHUB_EMOJI ?? "1125070689146261544",
	kofi: process.env.KOFI ?? "1125076879683100692",
};
