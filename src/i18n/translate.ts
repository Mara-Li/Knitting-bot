import * as Djs from "discord.js";
import { default as i18next } from "i18next";
import db from "../database.js";
import EnglishUS from "./locales/en.json" with { type: "json" };
import French from "./locales/fr.json" with { type: "json" };

export const t = i18next.getFixedT("en");

export function ln(userLang: Djs.Locale) {
	if (userLang === Djs.Locale.EnglishUS || userLang === Djs.Locale.EnglishGB)
		return i18next.getFixedT("en");
	const localeName = Object.entries(Djs.Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export const resources = {
	en: {
		translation: EnglishUS,
	},
	fr: {
		translation: French,
	},
};

export enum LocalePrimary {
	// noinspection JSUnusedGlobalSymbols
	French = "Français",
	English = "English",
}

export function cmdLn(key: string, lowercase = false) {
	const localized: Djs.LocalizationMap = {};
	const allValidLocale = Object.entries(Djs.Locale);
	const allTranslatedLanguages = Object.keys(resources).filter(
		(lang) => !lang.includes("en")
	);
	for (const [name, Locale] of allValidLocale) {
		if (allTranslatedLanguages.includes(Locale)) {
			const ul = ln(name as Djs.Locale);
			const rep = ul(key);
			localized[Locale as Djs.Locale] = lowercase ? rep.toLowerCase() : rep;
		}
	}
	return localized;
}

export function getUl(interaction: Djs.CommandInteraction) {
	return getTranslation(interaction.guild!.id, {
		locale: interaction.locale,
		preferredLocale: interaction.guild?.preferredLocale,
	});
}

export function getTranslation(
	guildId: string,
	defaultLocales: { preferredLocale?: Djs.Locale; locale: Djs.Locale }
) {
	const { preferredLocale, locale } = defaultLocales;
	const lang = db.getLanguage(guildId) ?? preferredLocale ?? locale;
	return ln(lang);
}
