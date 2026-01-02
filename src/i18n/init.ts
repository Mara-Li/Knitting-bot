import i18next from "i18next";
import * as EnglishUS from "./locales/en.json";
import * as French from "./locales/fr.json";

export const resources = {
	en: { translation: EnglishUS },
	fr: { translation: French },
};

i18next
	.init({
		fallbackLng: "en",
		lng: "en",
		resources,
		returnNull: false,
	})
	.then((r) => console.log("i18next initialized", r.name));

export default i18next;
