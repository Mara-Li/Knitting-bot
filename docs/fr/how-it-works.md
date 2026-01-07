# Fonctionnement

Pour des raisons d'optimisation, le bot mentionnera d'abord les `@rôles` d'abord lorsqu'un fil doit être mis à jour. Ensuite, il vérifiera si certains utilisateurs (qui n'ont pas de rôle/rôle autorisé) peuvent voir le fil et les ajoutera.
De plus, s'il n'y a aucun rôle dans le serveur, le bot traitera la liste des membres à la place.

Notez que le rôle sera mentionné si certains utilisateurs ayant le rôle ne sont pas dans le fil de discussion.

Après avoir fait la liste des utilisateurs et rôles à mentionner, il y a deux possibilités :
- Si un ancien message du bot existe, le bot le modifiera avec la liste.
- Sinon, le bot enverra un nouveau message avec `_ _`[^1] (pour éviter de mentionner les utilisateurs) puis le modifiera avec la liste.

Après avoir envoyé/édité le message, le bot modifiera le message en utilisant `_ _` (ou la configuration)

> [!WARNING]
> Le message ne sera donc pas supprimé, car mentionner un utilisateur dans un ancien message ne faisait pas de notification "blanche".
> Donc, le bot gardera les messages pour les éditer si le fil a besoin d'être mise à jour. Pour ne pas avoir à rechercher systématiquement le message, le bot gardera l'ID du message dans une base de données.
> Avec cela, les anciens utilisateurs n'auront donc pas de notification du tout.

[^1]: Ce message est configurable.