# config (/config)

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

> [!NOTE] 
> Les boutons seront verts si leur activation autorise un mode ou un évènement, et rouge si elle le désactive.

## `/config aide`

Affiche les informations générale sur la configuration du bot, ainsi qu'un lien vers le README.

## `/config pin`
Normalement, le bot envoie un message ( `_ _` par défaut) dans le fil de discussion, et le modifie pour ajouter les utilisateurs/ rôles. Ensuite, lorsque le bot met à jour le fil pour ajouter les utilisateurs, il modifie ce message.
Mais, parfois, le bot ne peut pas retrouver le message (problème de cache, trop de messages dans le fil) et en crée un nouveau, ce qui peut être gênant car cela crée un nouveau message (et donc une nouvelle notification).
Avec cette commande, vous pouvez configurer le bot pour qu'il épingle le message qu'il crée dans le fil de discussion. Il lui sera ainsi plus facile de le retrouver, et évitera de créer de nouveaux messages.

> [!WARNING]
> Même avec cette option, il est possible que le bot ne retrouve pas le message, mais cela ajoutera une couche de fiabilité supplémentaire.

## `/config placeholder`
Par défaut, le bot envoie un message avec le contenu `_ _` dans le fil de discussion pour le modifier plus tard.
Avec cette commande, vous pouvez changer ce message de placeholder pour un message personnalisé.

[^1]: Le channel inclut ici les threads, channels, forums et catégories.