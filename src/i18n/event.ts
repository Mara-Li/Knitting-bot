import { CommandName, get } from "../../maps";
import i18next from "../i18next";

i18next.on("languageChanged", () => {
	i18next.t = i18next.getFixedT("en", get(CommandName.language));
});
