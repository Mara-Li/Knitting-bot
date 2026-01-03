# Mise à jour des fils

Si vous voulez mettre à jour manuellement un fil, vous pouvez utiliser les commandes slash :

- `/update thread (thread)`: Mettre à jour un fil spécifique. Si aucun fil n'est spécifié, le fil actuel sera mis à jour.
- `/update tout (?archivé)`: Mettre à jour tous les fils sur le serveur. Utilisez l'option `archivé` pour inclure les fils archivés.
- `/update aide` : Affiche l'aide pour les commandes slash.

Ces commandes n'apparaissent pas pour les utilisateurs qui n'ont pas la permission `gérer les fils` (`manage thread` en anglais).

> [!WARNING]
> Tous les utilisateurs qui quittent le fil seront ré-ajoutés, même s'ils l'ont quitté volontairement.

> [!NOTE] 
> Il n'y a aucun moyen que je puisse coder quelque chose qui n'ajoute aucune notification (c'est-à-dire la bordure blanche) sur le fil. Vous aurez toujours le fil qui deviendra blanc lorsque le bot s'active.

De plus, vous pouvez configurer le bot et désactiver les événements que vous ne souhaitez pas utiliser. Vous pouvez le faire avec la commande `/config`. Vous pouvez voir la config