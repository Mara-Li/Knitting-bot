# Ignore

Permet d'exclure des salons de discussion[^1] et/ou des rôles de l'auto-invitation par Knitting.

> [!WARNING]
> Vous ne pouvez "suivre" et "ignorer" en même temps. Par exemple :
> - Si vous avez activé le mode <mark>channel uniquement</mark>, vous ne pouvez ignorer un channel[^1].
> - Si vous avez activé le mode <mark>rôle uniquement</mark>, vous ne pouvez ignorer un rôle.
> - Vous ne pouvez pas utiliser les autres configurations si vous avez activé <mark>[@role] dans [#channel]</mark>.

## Ignorer des salons textuels

> [!info]
> **`/ignore channel [type]`**
> - **`type`** : `Channel` | `thread` | `forum` | `catégorie`

Cette commande est utilisable si le mode <mark>channel uniquement</mark> est **désactivé**.

Comme pour [`suivre channel`](follow.md#Suivre%20des%20salons%20de%20discussions), vous devez spécifier le type que vous souhaitez gérer, puis manipuler les sélections dans le modal.

> [!warning]
> Discord limitant les sélections à un maximum de 25, si vous devez avoir plus de 25 éléments, des menus avec paginations s'ouvriront : ![[fr_pagination.png]]
> De préférence, merci de privilégier la gestion des threads via des catégories dans le cas où un grand nombre de salons doivent être suivis.

## Ignorer des rôles

> [!info]
> `/ignore role`

A l'instar de la commande précédente, cette commande n'est utilisable que lorsque le mode <mark>rôle uniquement</mark> est **désactivé**.

Vous ne pouvez gérer que 25 rôles maximum.

## Ignorer spécifique

> [!info]
> `/ignore spécifique [@role] [type]`
> - **`@role`** : Le rôle à gérer
> - **`type`** : `Channel` | `thread` | `forum` | `catégorie` | `supprimer`

Ce mode n'est utilisable que si <mark>suivre [@role] dans [#channel]</mark> est **désactivé**.

Tout comme [dans ignorer un channel](#Ignorer%20un%20channel), il y a un système de pagination pour gérer plus de 25 salons textuels à la fois.

Pour supprimer un rôle, il suffit de sélectionner `supprimer`.

## Afficher la liste des ignorés

> [!info]
> `/ignore liste`

Permet d'afficher la liste des rôles et des salons ignorés.

[^1]: Le channel inclut ici les threads, channels, forums et catégories.