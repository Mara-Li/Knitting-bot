# Configuration

La commande slash `/config` vous permet de configurer le bot. Elle ouvrira une fenêtre avec des boutons pour changer la configuration.

## `/config langue`
Permet d'afficher la langue actuelle et de la changer.

## `/config mode`

Affiche les modes actuels et permet de les changer. Vous pouvez :
- Suivre uniquement un channel[^1] spécifique.
- Suivre uniquement un rôle spécifique.
- `Suivre [@role] pour [@channel]`, mode qui ne peut pas être utilisé avec les autres modes.

## `/config auto`

Permet d'afficher les événements automatiques actuels et de les changer. Vous pouvez activer ou désactiver les évènements automatiques suivants :
- Création d'un fil de discussion.
- Mise à jour des permissions d'un channel, catégorie, forum ou thread.
- Mise à jour des rôles d'un utilisateur.
- Arrivée d'un utilisateur sur le serveur.

Vous pouvez aussi activer le mode `manuel`, qui désactive tous les évènements automatiques.

## `/config aide`

Affiche les informations générale sur la configuration du bot, ainsi qu'un lien vers le README.

## `/config pin`

Normalement, le bot envoie un message (`_ _` par défaut) dans le fil de discussion, et le modifie pour ajouter les utilisateurs/rôles. Ensuite, lorsque le bot met à jour le fil pour ajouter les utilisateurs, il modifie ce message.

Ce message est automatiquement sauvegardé dans la base de données via ses identifiants (`thread.id` puis `message.id`).

Cependant, lors de rares cas, le message peut ne pas être retrouvé alors qu'il existe.

Ce paramètre permet d'épingler automatiquement le *placeholder* pour retrouver plus facilement le message lorsqu'il ne se trouve pas dans la base de données.

> [!warning] 
> Si le message n'est pas retrouvé ni dans la base ni dans les messages épinglés, le bot tentera de le retrouver dans les messages des fils avec une certaine limite au nombre de messages. Si le message n'est pas retrouvé, il sera reconstruit.

## `/config placeholder`
Par défaut, le bot envoie un message avec le contenu `_ _` dans le fil de discussion pour le modifier plus tard.
Avec cette commande, vous pouvez changer ce message de *placeholder* pour un message personnalisé.

## `/config afficher`

Permet d'afficher la configuration actuelle du serveur.

[^1]: Le channel inclut ici les threads, channels, forums et catégories.