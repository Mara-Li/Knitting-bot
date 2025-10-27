# Follow (suivre)

Permet de ne ping uniquement certains channels ou rôle spécifique.

Vous devez préalablement activer les modes "follow-only" avec la commande [`/config`](./config.md).

- `/follow channel (channel)` : Ajoute un channel à la liste des channels[^1] à suivre. Si aucun channel n'est spécifié, le channel actuel sera ajouté.
- `/follow role [role]` : Ajoute un rôle à la liste des rôles à suivre.
- `/follow spécifique [role] [channel]` : Permet de suivre un rôle pour un channel[^1] spécifique.
  - Vous pouvez utiliser cette commande plusieurs fois pour ajouter plusieurs channels.
  - Si vous voulez supprimer un channel pour un rôle, vous devez refaire la commande avec le même channel.
  - Pour supprimer un rôle, vous devez refaire la commande sans spécifier de channel.
- `/follow list` : Affiche la liste des channels et rôles à suivre.

> [!NOTE] 
> Pour arrêter de suivre un channel ou un rôle, vous devez refaire la commande avec le même channel/role.