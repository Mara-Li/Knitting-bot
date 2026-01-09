# Suivre

Permet de ne ping uniquement certains channels ou rôle spécifique.

## Suivre des salons de discussions

> [!info]
> **`/suivre channel [type]`**
> - **`type`** : `Channel` | `thread` | `forum` | `catégorie`

Cette commande est utilisable uniquement si le mode `Suivre certains channels` est activé. 

Vous devez choisir un type de salons textuels à gérer. Ensuite, un *modal* s'ouvrira, qui permettra de supprimer ou ajouter de nouveau salons à suivre.

> [!warning]
> Discord limitant les sélections à un maximum de 25, si vous devez avoir plus de 25 éléments, des menus avec paginations s'ouvriront : ![](../../_media/fr_pagination.png)
> De préférence, merci de privilégier la gestion des threads via des catégories dans le cas où un grand nombre de salons doivent être suivis.

## Suivre des rôles

> [!info]
> `/suivre role`

Cette commande est utilisable uniquement si le mode `Suivre certains rôle` est activé.

Vous pouvez gérer, au maximum, que 25 rôles.

## Suivie spécifique

> [!info]
> `/suivre spécifique [@role] [type]`
> - **`@role`** : Le rôle à gérer
> - **`type`** : `Channel` | `thread` | `forum` | `catégorie` | `supprimer`

Ce mode n'est utilisable que lorsque `[@suivre] dans [#channel]` est activé.

Tout comme dans [suivre des salons de discussions](#Suivre%20des%20salons%20de%20discussions), il y a un système de pagination pour gérer plus de 25 salons textuels à la fois.

Pour supprimer un rôle, il suffit de sélectionner `supprimer`.

## Afficher la liste des suivis

> [!info]
> `/suivre liste`

Permet d'afficher la liste des salons et des rôles suivis.