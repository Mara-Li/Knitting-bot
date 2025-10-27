# Configuration

The slash command `/config` allows you to configure the bot. It will open a window with buttons to change the configuration.

## `/config language`
Displays the current language and allows you to change it.

## `/config mode`

Displays the current modes and allows you to change them. You can:
- Only follow a specific channel (_Note: Here, "channel" includes categories, forums, threads, and channels).
- Only follow a specific role.
- Use the "[@role] for [@channel]" mode, which cannot be used with other modes.

## `/config auto`

Displays the current automatic events and allows you to change them. You can enable or disable the following automatic events:
- Thread creation.
- Channel, category, forum, or thread permission updates.
- User role updates.
- User joining the server.

You can also enable the "manual" mode, which disables all automatic events.

## `/config help`

Displays general information about bot configuration, as well as a link to the README.

> [!NOTE]  
> The button will be red if activate it will disable the event, and green if it will enable it.