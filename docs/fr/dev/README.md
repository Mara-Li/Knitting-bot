# 🤖 Développement

Le bot est créé avec [discord.js](https://discord.js.org/#/). Vous devez avoir [node.js (LTS)](https://nodejs.org/en/) installé sur votre ordinateur.
Après avoir cloné le référentiel, vous devez installer les dépendances avec:

```bash
npm run init
```

Le script vous demandera vos variables `.env` et le fichier sera automatiquement créé.
Le fichier doit ressembler à ceci :

```dotenv
BOT_TOKEN=your_token
CLIENT_ID=your_client_id
NODE_ENV=development# ou production
MESSAGE= #N'importe quoi
GITHUB_EMOJI="1125070935855222845" #Emoji ID
KOFI="1125071623658164274" #Emoji ID
DISCORD="1125072006937849876" #Emoji ID
```

> [!NOTE] 
> Si vous voulez test le bot, vous devez d'abord créer une application sur le [discord developer portal](https://discord.com/developers/applications).
> [Vous trouverez ici un tutoriel](https://devcommunity.gitbook.io/bot/robot-discord-pas-a-pas/creez-lapplication-de-votre-bot)
> N'oubliez pas d'inviter le bot sur un serveur de test !

- `BOT_TOKEN` est le token du bot que vous pouvez obtenir à partir de `Bot` > `Reset token` dans le portail des développeurs.
- `CLIENT_ID` est l'identifiant de l'application que vous pouvez obtenir à partir de `General Information` > `Client ID` dans le portail des développeurs.
- `NODE_ENV` est l'environnement de développement. Cela peut être `development` ou `production`. En mode développement, les logs seront plus détaillés.
- `MESSAGE` est le message que le bot enverra lors du chargement des rôles/utilisateurs. Vous pouvez un simple message, un emoji, des stickers, ou encore des émojis personnalisés. Si vous utilisez ces derniers, vous devez vous assurer que le bot est sur le même serveur que l'émoji (mais il peut les utiliser partout).

Le bot utilise Enmap pour stocker des données. Vous pouvez trouver la documentation [ici](https://enmap.evie.dev/). Vous avez besoin d'une installation spéciale pour cela, donc suivez les instructions [ici](https://enmap.evie.dev/install).