# Follow

Allow to ping only in some channels or roles.

## Follow text channels

> [!info]
> **`/follow channel [type]`**
> - **`type`** : `Channel` | `thread` | `forum` | `category`

This command can only be used if the `Follow only channels` mode is enabled.

You must choose a type of text chat to manage. Then, a *modal* will open, allowing you to delete or add new chats to follow.

> [!warning]
> Discord limits selections to a maximum of 25. If you need to have more than 25 items, paginated menus will open: ![](../../_media/en_pagination.png)
> If you need to follow a large number of rooms, we recommend managing threads using categories.

## Follow roles

> [!info]
> `/follow role`

This command can only be used if the `Follow only roles` mode is enabled.

You can manage a maximum of 25 roles.

## Follow specifics

> [!info]
> `/follow specific [@role] [type]`
> - **`@role`** : The role to manage
> - **`type`** : `Channel` | `thread` | `forum` | `category` | `delete`

This mode can only be used when `[@follow] in [#channel]` is enabled.

As with [follow text channels](#Follow%20text%20channels), there is a pagination system for managing more than 25 text rooms at a time.

To remove a role, simply select `delete` in the type.

## Display the followed list

> [!info]
> `/follow list`

Display the channel and roles followed.
