# 🎼 Translation

The bot is translated in:

- [x] French
- [x] English

I use i18next to translate the bot. You can find the documentation [here](https://www.i18next.com/).

If you want to add a translation, you need to:

- Duplicate `src/i18next/locales/en.json` and rename it with the language code (ex: `fr.json`)
- Translate the file
- Update the `src/i18next/index.ts` and add the language in the `ressources` object, without forgetting to import it (ex: `import * as fr from "./locales/fr.json";`)
- You need to update **all** commands (`src/commands`) file, and update:
  - Adding `const lang = i18next.getFixedT("lang");` at the top of the file
  - Adding `setNameLocalizations({lang: lang("same key of other langue")})`
  - Adding the language directly in `setDescriptionLocalizations`.
    You can get more information about [commands localization on the official discordJS documentation](https://discordjs.guide/slash-commands/advanced-creation.html#localizations)
    The slash commands language is directly based on your discord client language.
