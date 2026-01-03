import i18next from "i18next";
import { resources } from "./translate";

export * from "./translate";

await i18next.init({
	fallbackLng: "en",
	lng: "en",
	resources,
	returnNull: false,
});
