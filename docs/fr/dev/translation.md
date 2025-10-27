# 🎼 Traduction

Le bot est traduit en :

- [x] Français
- [x] Anglais

J'utilise i18next pour traduire le bot. Vous pouvez trouver la documentation [ici](https://www.i18next.com/).

Si vous voulez ajouter une traduction, vous devez :

- Dupliquer `src/i18next/locales/en.json` et le renommer avec le code de la langue (ex: `fr.json`)
- Traduire le fichier
- Mettre à jour le fichier `src/i18next/index.ts` et ajouter la langue dans l'objet `ressources`, sans oublier de l'importer (ex: `import * as fr from "./locales/fr.json";`)
- Vous devez mettre à jour **tous** les fichiers de commandes (`src/commands`), et mettre à jour:
  - Ajout de `const lang = i18next.getFixedT("lang");` en haut du fichier
  - Ajout de `setNameLocalizations({lang: lang("même clé que pour l'autre langue")})`
  - Ajout de la langue directement dans `setDescriptionLocalizations`.
    Vous pouvez obtenir plus d'informations sur la [localisation des commandes dans la documentation officielle de DiscordJS](https://discordjs.guide/slash-commands/advanced-creation.html#localizations).
    La langue des commandes slash est directement basée sur la langue de votre client Discord.
