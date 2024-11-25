import * as Djs from "discord.js";
import { default as i18next } from "i18next";
import { resources } from "./init";

export function ln(userLang: Djs.Locale) {
	if (userLang === Djs.Locale.EnglishUS || userLang === Djs.Locale.EnglishGB)
		return i18next.getFixedT("en");
	const localeName = Object.entries(Djs.Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export function cmdLn(key: string, lowerCase = false) {
	const localized: Djs.LocalizationMap = {};
	const allValidLocale = Object.entries(Djs.Locale);
	const allTranslatedLanguages = Object.keys(resources).filter(
		(lang) => !lang.includes("en"),
	);
	for (const [name, Locale] of allValidLocale) {
		if (allTranslatedLanguages.includes(Locale)) {
			const ul = ln(name as Djs.Locale);
			// @ts-ignore
			if (resources.en.translation[key]) {
				//@ts-ignore
				const t = ul(key) as string;
				if (lowerCase) localized[Locale as Djs.Locale] = t.toLowerCase();
				else localized[Locale as Djs.Locale] = t;
			}
		}
	}
	return localized;
}
