# Configuration

The slash command `/config` allows you to configure the bot. It will open a window with buttons to change the configuration.

## `/config language`
Displays the current language and allows you to change it.

## `/config mode`

Displays the current modes and allows you to change them. You can:
- Only follow a specific channel[^1]
- Only follow a specific role.
- Use the `[@role] for [@channel]` mode, which cannot be used with other modes.

## `/config auto`

Displays the current automatic events and allows you to change them. You can enable or disable the following automatic events:
- Thread creation.
- Channel, category, forum, or thread permission updates.
- User role updates.
- User joining the server.

You can also enable the "manual" mode, which disables all automatic events.

> [!NOTE]  
> The button will be red if activate it will disable the event, and green if it will enable it.

## `/config help`

Displays general information about bot configuration, as well as a link to the README.

## `/config pin`
Normally, the bot send a message (`_ _` by default) in thread, and edit them to add the users/roles. After, when the bot update the thread to add the users, it will edit this message.
But, sometimes, the bot can't found the message (cache issue, too many messages in the thread) and create a new one, which can be annoying as it will create a new message (and thereafter, a ping).
With this command, you can configure the bot to pin the message it creates in the thread. It will be easier for the bot to find it again, and avoid creating new messages.

> [!WARNING]
> Even with this option, it can be possible that the bot doesn't find the message, but it will add more layer of reliability.

## `/config placeholder`

By default, the bot send a message with `_ _` content in the thread to edit it later.
With this command, you can change this placeholder message to a custom one.

[^1]: Channel includes here thread, channel, forum and category.
