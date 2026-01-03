//biome-ignore-all lint/suspicious/noExplicitAny: Allow explicit any for this extension file because it's simpler.

import * as Djs from "discord.js";
import { cmdLn, t } from "./i18n";

declare module "discord.js" {
	interface SlashCommandBuilder {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandSubcommandBuilder {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	// noinspection JSClassNamingConvention
	interface SlashCommandSubcommandGroupBuilder {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandStringOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandBooleanOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandChannelOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandRoleOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandNumberOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandIntegerOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandMentionableOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandUserOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandAttachmentOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}
}

const SET_NAMES_IMPL = function (this: any, key: string) {
	return this.setName(t(key).toLowerCase()).setNameLocalizations(cmdLn(key, true));
};

const SET_DESCRIPTIONS_IMPL = function (this: any, key: string) {
	return this.setDescription(t(key)).setDescriptionLocalizations(cmdLn(key));
};

/**
 * Generic helper to apply setNames and setDescriptions methods to multiple prototypes.
 * Reduces duplication and ensures consistency across all builder types.
 *
 * @param prototypes - Array of constructor prototypes to extend
 */
function applyLocalizationMethods(prototypes: (object | undefined)[]) {
	for (const prototype of prototypes) {
		if (prototype) {
			Object.defineProperty(prototype, "setNames", { value: SET_NAMES_IMPL });
			Object.defineProperty(prototype, "setDescriptions", {
				value: SET_DESCRIPTIONS_IMPL,
			});
		}
	}
}

// Apply localization methods to all Discord.js builders and options
applyLocalizationMethods([
	// Command builders
	Djs.SlashCommandBuilder.prototype,
	Djs.SlashCommandSubcommandBuilder.prototype,
	Djs.SlashCommandSubcommandGroupBuilder.prototype,
	// Option types
	Djs.SlashCommandStringOption.prototype,
	Djs.SlashCommandBooleanOption.prototype,
	Djs.SlashCommandChannelOption.prototype,
	Djs.SlashCommandRoleOption.prototype,
	Djs.SlashCommandNumberOption.prototype,
	Djs.SlashCommandIntegerOption.prototype,
	Djs.SlashCommandMentionableOption.prototype,
	Djs.SlashCommandUserOption.prototype,
	Djs.SlashCommandAttachmentOption.prototype,
]);
