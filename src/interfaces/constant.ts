import process from "node:process";
import pkg from "../../package.json" with { type: "json" };

export const EMOJI =
	process.env.MESSAGE && process.env.MESSAGE.trim().length > 0
		? process.env.MESSAGE
		: "_ _";
export const VERSION = pkg.version ?? "0.0.0";
export const DESTROY_DATABASE = process.env.DESTROY === "true";
export const INFO_EMOJI = {
	discord: process.env.DISCORD ?? "💻",
	docs: process.env.DOCS ?? "📚",
	github: process.env.GITHUB_EMOJI ?? "🐙",
	kofi: process.env.KOFI ?? "☕",
};
