# Ignore

The exact opposite of the follow command. It won't ping the channels or roles ignored.

- `/ignore channel (channel)` : Add a channel to the list of ignored channels[^1]. If the channel is not specified, it will use the current channel.
- `/ignore role [role]` : Add a role to the list of ignored roles
- `/ignore specific [role] [channel]` : Add a role to the list of ignored roles in a specific channel[^1].
  - You can repeat the command with the same role to add multiple channels.
  - To remove a channel, you need to redo the command with the same channel and role.
  - To remove a role completely, you need to do the command without the channel.
- `/ignore list` : List all ignored channels and roles

> [!NOTE]  
> To un-ignore a channel, you need to redo the command with the same channel. Same for the role.

> [!WARNING]  
> You can't follow and ignore "role" or "channel" at the same time.
> For example:
>
> - If the `only-channel` mode is activated, you can't ignore a channel.
> - If the `only-role` mode is activated, you can't ignore a role.
>   Factually, the `follow` commands will ignore all un-specified channels/roles.