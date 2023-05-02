import i18next from "i18next";
import { translationLanguage } from "../maps";
import * as en from "./locales/en.json";
import * as fr from "./locales/fr.json";

export const ressources = {
	en: { translation: en },
	fr: { translation: fr },
} as const;


export const languageValue = {
	en: "English",
	fr: "Français",
};


i18next.init({
	lng: translationLanguage,
	fallbackLng: "en",
	resources: ressources,
	returnNull: false,
});

export default i18next;
