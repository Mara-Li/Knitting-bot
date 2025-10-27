# Comment ça fonctionne

Pour des raisons d'optimisation, le bot mentionnera d'abord les @rôle d'abord lorsqu'un fil doit être mis à jour. Ensuite, il vérifiera si certains utilisateurs (qui n'ont pas de rôle/role autorisé) peuvent voir le fil et les ajoutera.
De plus, s'il n'y a aucun rôle dans le serveur, le bot traitera la liste des membres à la place.

Notez que le rôle sera mentionné si certains utilisateurs ayant le rôle ne sont pas dans le fil de discussion.

Après avoir fait la liste des utilisateurs et rôles à mentionner, il y a deux possibilités :

- Si un ancien message du bot existe, le bot le modifiera avec la liste.
- Sinon, le bot enverra un nouveau message avec `_ _` (pour éviter de mentionner les utilisateurs) puis le modifiera avec la liste.

Après avoir envoyé/édité le message, le bot modifiera le message de nouveau pour le rendre vide (en utilisant `_ _`).

> [!WARNING]
> Le message ne sera donc pas supprimé, car j'ai découvert que mentionner un utilisateur dans un ancien message ne faisait pas de notification "blanche".
> Donc, le bot gardera les message pour les éditer quand le thread a besoin d'être mise à jour.
> Avec cela, les anciens utilisateurs n'auront donc pas de notification du tout.