# config (/config)

La commande slash `/config` vous permet de configurer le bot. Elle ouvrira une fenêtre avec des boutons pour changer la configuration.

## `/config langue`
Permet d'afficher la langue actuelle et de la changer.

## `/config mode`

Affiche les modes actuels et permet de les changer. Vous pouvez :
- Suivre uniquement un channel spécifique (_Note :_ Channel ici inclut les catégories, forum, thread et salon).
- Suivre uniquement un rôle spécifique.
- Suivre [@role] pour [@channel], mode qui ne peut pas être utilisé avec les autres modes.

## `/config auto`

Permet d'afficher les événements automatiques actuels et de les changer. Vous pouvez activer ou désactiver les évènements automatiques suivants :
- Création d'un fil de discussion.
- Mise à jour des permissions d'un channel, catégorie, forum ou thread.
- Mise à jour des rôles d'un utilisateur.
- Arrivée d'un utilisateur sur le serveur.

Vous pouvez aussi activer le mode `manuel`, qui désactive tous les évènements automatiques.

#### `/config aide`

Affiche les informations générale sur la configuration du bot, ainsi qu'un lien vers le README.

> [!NOTE] 
> Les boutons seront verts si leur activation autorise un mode ou un évènement, et rouge si elle le désactive.
