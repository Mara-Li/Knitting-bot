import i18next from "../i18next";
import {get} from "../../maps";

i18next.on("languageChanged", () => {
	console.log("Language changed");
	i18next.t = i18next.getFixedT("en", get("language"));
});
