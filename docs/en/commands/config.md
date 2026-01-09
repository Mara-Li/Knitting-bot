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

## `/config help`

Displays general information about bot configuration, as well as a link to the README.

## `/config pin`

Normally, the bot sends a message (`_ _` by default) to the thread and modifies it to add users/roles. Then, when the bot updates the thread to add users, it modifies this message.

This message is automatically saved in the database via its identifiers (`thread.id` then `message.id`).

However, in rare cases, the message may not be found even though it exists.

This setting allows you to automatically pin the *placeholder* in order to find the message more easily in case it is not in the database.

> [!warning] 
> If the message is not found in the database or in pinned messages, the bot will attempt to find it in thread messages with certain limits on the number of messages. If the message is not found, it will be reconstructed.

## `/config placeholder`

By default, the bot send a message with `_ _` content in the thread to edit it later.
With this command, you can change this placeholder message to a custom one.

## `/config display`

Display the actual server configuration.

[^1]: Channel includes here thread, channel, forum and category.
