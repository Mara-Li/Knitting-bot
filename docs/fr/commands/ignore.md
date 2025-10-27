# Ignore

Permet d'ignorer un channel ou un rôle spécifique : le bot ne mentionnera pas les utilisateurs qui ont ce rôle ou qui sont dans ce channel, ou les deux.

- `/ignore channel (channel)` : Ajoute un channel à la liste des channels à ignorer[^1]. Si aucun channel n'est spécifié, le channel actuel sera ajouté.
- `/ignore role [role]` : Ajoute un rôle à la liste des rôles à ignorer.
- `/ignore spécifique [role] [channel]` : Permet d'ignorer un rôle pour un channel[^1] spécifique.
  - Vous pouvez utiliser cette commande plusieurs fois pour ajouter plusieurs channels.
  - Si vous voulez supprimer un channel pour un rôle, vous devez refaire la commande avec le même channel.
  - Pour supprimer un rôle, vous devez refaire la commande sans spécifier de channel.
- `/ignore liste` : Affiche la liste des channels et rôles ignorés.

> [!NOTE] 
> Comme précédemment, pour arrêter d'ignorer un channel ou un rôle, vous devez refaire la commande avec le même channel/role.

> [!WARNING]
> Vous ne pouvez "suivre" et "ignorer" un channel en même temps. Par exemple :
>
> - Si vous avez activé le mode `follow channel`, vous ne pouvez ignorer un channel.
> - Si vous avez activé le mode `follow role`, vous ne pouvez ignorer un rôle.
> - Vous ne pouvez pas utiliser les autres configurations si vous avez activé `follow spécifique`.
>   Dans les faits, la commande `follow` ignorera tous les rôles/channels sauf ceux spécifiés dans la commande `follow`.
