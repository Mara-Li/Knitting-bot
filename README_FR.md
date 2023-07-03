# Knitting

→ [English translation](README.md)

[Lien d'invitation](https://discord.com/api/oauth2/authorize?client_id=1101559076086886500&permissions=292057785360&scope=bot)

Si vous voulez essayer le bot, vous pouvez rejoindre [ce serveur discord](https://discord.gg/TWjfz2yTSA) !

Un bot qui vous aide à ajouter un utilisateur à un fil de discussion, pour que le fil soit toujours visible pour tout le monde, sans les mentionner !

> **Note**  
> L'utilisateur ajouté au fil doit avoir la permission de le voir.

Le bot ajoutera automatiquement un utilisateur à un fil de discussion lorsque :

- Un utilisateur rejoint le serveur et a la permission de voir le fil.
- Un utilisateur est mis à jour et reçoit un nouveau rôle.
- Lorsqu'un canal ou une catégorie ont leurs autorisations modifiées.
- Lorsqu'un fil de discussion est créé.

Le bot ne fera rien lorsqu'il rejoindra le serveur. Si vous voulez mettre à jour tous les fils, vous pouvez utiliser la commande slash `/update all` (voir ci-dessous).

## Commandes Slash

### Configuration

La commande slash `/config` vous permet de configurer le bot. Elle ouvrira une fenêtre avec des boutons pour changer la configuration.

#### `/config langue`
Permet d'afficher la langue actuelle et de la changer.

#### `/config mode`

Affiche les modes actuels et permet de les changer. Vous pouvez :
- Suivre uniquement un channel spécifique (_Note :_ Channel ici inclut les catégories, forum, thread et salon).
- Suivre uniquement un rôle spécifique.
- Suivre [@role] pour [@channel], mode qui ne peut pas être utilisé avec les autres modes.

#### `/config auto`

Permet d'afficher les événements automatiques actuels et de les changer. Vous pouvez activer ou désactiver les évènements automatiques suivants :
- Création d'un fil de discussion.
- Mise à jour des permissions d'un channel, catégorie, forum ou thread.
- Mise à jour des rôles d'un utilisateur.
- Arrivée d'un utilisateur sur le serveur.

Vous pouvez aussi activer le mode `manuel`, qui désactive tous les évènements automatiques.

#### `/config aide`

Affiche les informations générale sur la configuration du bot, ainsi qu'un lien vers le README.

> **Note**  
> Les boutons seront verts si leur activation autorise un mode ou un évènement, et rouge si elle le désactive.

### Follow (suivre)

Permet de ne ping uniquement certains channels ou rôle spécifique.

Vous devez préalablement activer les modes "follow-only" avec la commande `/config`.

- `/follow channel (channel)` : Ajoute un channel à la liste des channels[^1] à suivre. Si aucun channel n'est spécifié, le channel actuel sera ajouté.
- `/follow role [role]` : Ajoute un rôle à la liste des rôles à suivre.
- `/follow spécifique [role] [channel]` : Permet de suivre un rôle pour un channel[^1] spécifique.
  - Vous pouvez utiliser cette commande plusieurs fois pour ajouter plusieurs channels.
  - Si vous voulez supprimer un channel pour un rôle, vous devez refaire la commande avec le même channel.
  - Pour supprimer un rôle, vous devez refaire la commande sans spécifier de channel.
- `/follow list` : Affiche la liste des channels et rôles à suivre.

> **Note**  
> Pour arrêter de suivre un channel ou un rôle, vous devez refaire la commande avec le même channel/role.

### Ignore

Permet d'ignorer un channel ou un rôle spécifique : le bot ne mentionnera pas les utilisateurs qui ont ce rôle ou qui sont dans ce channel, ou les deux.

- `/ignore channel (channel)` : Ajoute un channel à la liste des channels à ignorer[^1]. Si aucun channel n'est spécifié, le channel actuel sera ajouté.
- `/ignore role [role]` : Ajoute un rôle à la liste des rôles à ignorer.
- `/ignore spécifique [role] [channel]` : Permet d'ignorer un rôle pour un channel[^1] spécifique.
  - Vous pouvez utiliser cette commande plusieurs fois pour ajouter plusieurs channels.
  - Si vous voulez supprimer un channel pour un rôle, vous devez refaire la commande avec le même channel.
  - Pour supprimer un rôle, vous devez refaire la commande sans spécifier de channel.
- `/ignore liste` : Affiche la liste des channels et rôles ignorés.

> **Note**  
> Comme précédemment, pour arrêter d'ignorer un channel ou un rôle, vous devez refaire la commande avec le même channel/role.

> **Warning**  
> Vous ne pouvez "suivre" et "ignorer" un channel en même temps. Par exemple :
>
> - Si vous avez activé le mode `follow channel`, vous ne pouvez ignorer un channel.
> - Si vous avez activé le mode `follow role`, vous ne pouvez ignorer un rôle.
> - Vous ne pouvez pas utiliser les autres configurations si vous avez activé `follow spécifique`.
>   Dans les faits, la commande `follow` ignorera tous les rôles/channels sauf ceux spécifiés dans la commande `follow`.

### Mise à jour des fils

Si vous voulez mettre à jour manuellement un fil, vous pouvez utiliser les commandes slash :

- `/update thread (thread)`: Mettre à jour un fil spécifique. Si aucun fil n'est spécifié, le fil actuel sera mis à jour.
- `/update tout`: Mettre à jour tous les fils sur le serveur.
- `/update aide` : Affiche l'aide pour les commandes slash.

Ces commandes n'apparaissent pas pour les utilisateurs qui n'ont pas la permission `gérer les fils` (`manage thread` en anglais).

> **Warning**  
> Tous les utilisateurs qui quittent le fil seront ré-ajoutés, même s'ils l'ont quitté volontairement.

> **Note**  
> Il n'y a aucun moyen que je puisse coder quelque chose qui n'ajoute aucune notification (c'est-à-dire la bordure blanche) sur le fil. Vous aurez toujours le fil qui deviendra blanc lorsque le bot s'active.

De plus, vous pouvez configurer le bot et désactiver les événements que vous ne souhaitez pas utiliser. Vous pouvez le faire avec la commande `/config`. Vous pouvez voir la configuration avec `/config afficher`.

### Info

Un simple embed avec des informations sur le bot et le développeur principal.

## Comment ça fonctionne

Pour des raisons d'optimisation, le bot mentionnera d'abord les @rôle d'abord lorsqu'un fil doit être mis à jour. Ensuite, il vérifiera si certains utilisateurs (qui n'ont pas de rôle/role autorisé) peuvent voir le fil et les ajoutera.
De plus, s'il n'y a aucun rôle dans le serveur, le bot traitera la liste des membres à la place.

Notez que le rôle sera mentionné si certains utilisateurs ayant le rôle ne sont pas dans le fil de discussion.

Après avoir fait la liste des utilisateurs et rôles à mentionner, il y a deux possibilités :

- Si un ancien message du bot existe, le bot le modifiera avec la liste.
- Sinon, le bot enverra un nouveau message avec `_ _` (pour éviter de mentionner les utilisateurs) puis le modifiera avec la liste.

Après avoir envoyé/édité le message, le bot modifiera le message de nouveau pour le rendre vide (en utilisant `_ _`).

> **Warning**  
> Le message ne sera donc pas supprimé, car j'ai découvert que mentionner un utilisateur dans un ancien message ne faisait pas de notification "blanche".
> Donc, le bot gardera les message pour les éditer quand le thread a besoin d'être mise à jour.
> Avec cela, les anciens utilisateurs n'auront donc pas de notification du tout.

## Permission requise

Le bot a besoin de certaines permissions pour fonctionner :

- Présence
- Membres du serveur

(Pour une raison inconnue, le bot a besoin de la permission de présence pour obtenir l'identifiant de l'utilisateur lorsqu'il rejoint le serveur.)

---

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

> **Note**  
> Si vous voulez test le bot, vous devez d'abord créer une application sur le [discord developer portal](https://discord.com/developers/applications).
> [Vous trouverez ici un tutoriel](https://devcommunity.gitbook.io/bot/robot-discord-pas-a-pas/creez-lapplication-de-votre-bot)
> N'oubliez pas d'inviter le bot sur un serveur de test !

- `BOT_TOKEN` est le token du bot que vous pouvez obtenir à partir de `Bot` > `Reset token` dans le portail des développeurs.
- `CLIENT_ID` est l'identifiant de l'application que vous pouvez obtenir à partir de `General Information` > `Client ID` dans le portail des développeurs.
- `NODE_ENV` est l'environnement de développement. Cela peut être `development` ou `production`. En mode développement, les logs seront plus détaillés.
- `MESSAGE` est le message que le bot enverra lors du chargement des rôles/utilisateurs. Vous pouvez un simple message, un emoji, des stickers, ou encore des émojis personnalisés. Si vous utilisez ces derniers, vous devez vous assurer que le bot est sur le même serveur que l'émoji (mais il peut les utiliser partout).

Le bot utilise Enmap pour stocker des données. Vous pouvez trouver la documentation [ici](https://enmap.evie.dev/). Vous avez besoin d'une installation spéciale pour cela, donc suivez les instructions [ici](https://enmap.evie.dev/install).

## 🎼 Traduction

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

---

# Thread Watcher

Un bot cool à utiliser avec ce bot est [Thread Watcher](https://threadwatcher.xyz/) !

[^1]: Channel inclut ici catégorie, channel, thread et forum.
