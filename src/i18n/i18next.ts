import i18next from "i18next";
import * as en from "./locales/en.json";
import * as fr from "./locales/fr.json";

export const resources = {
	en: { translation: en },
	fr: { translation: fr },
} as const;


i18next.init({
	lng: "en",
	fallbackLng: "en",
	resources,
	returnNull: false,
});

export default i18next;
