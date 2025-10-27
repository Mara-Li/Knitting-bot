# Follow

Allow to only "ping" specific channels or roles.

You need to activate the `follow-only` mode to use these commands. You can do that with the `/config` command.

- `/follow channel (channel)` : Add a channel to the list of followed channels[^1]. If the channel is not specified, it will use the current channel.
- `/follow role [role]` : Add a role to the list of followed roles
- `/follow specific [role] [channel]` : Add a role to the list of followed roles in a specific channel[^1].
  - You can repeat the command with the same role to add multiple channels.
  - To remove a channel, you need to redo the command with the same channel and role.
  - To remove a role completely, you need to do the command without the channel.
- `/follow list` : List all followed channels and roles

> [!NOTE]  
> To unfollow a channel/role, you need to redo the command with the same channel/role.

[^1]: Channel includes here thread, channel, forum and category.
