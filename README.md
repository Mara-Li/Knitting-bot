# Knitting

→ [Traduction française](README_FR.md)

[Invitation links](https://discord.com/api/oauth2/authorize?client_id=1101559076086886500&permissions=292057785360&scope=bot)

If you want to try out the bot, you can join [this discord server](https://discord.gg/TWjfz2yTSA)!

A bot that helps you to add user to a thread, to keep the thread always visible for everyone, and without pinging them!

> **Note**  
> The user added to the thread needs to have the permission to see it.

The bot will automatically add a user to a thread when:

- A user joins the server and has the permission to see the thread
- A user is updated and gets a new role
- When a channel or category that have their permission edited
- When a thread is created

The bot won't do anything when joining the server. If you want to update all threads, you can use the slash command `/update-all-threads` (see below).

## Slash Commands

### Configuration

The slash command `/config` allows you to configure the bot. It will open a embed with button to change the configuration. You can change:

- The language ;
- Enable the manual mode: It will disable all automatic event, and you will need to use the slash command `/update` to update a thread ;
- Enable / disable manually each automatic event:
  - Member update (changing role of member) ;
  - Thread creation (including forum thread) ;
  - Channel or category permission update ;
  - Member join the server ;
- And, also, some configuration about which channel/role will be followed by the bot:
  - Follow only specific channel ;
  - Follow only specific role ;
  - Follow [@role] in [#channel]. This mode can't be used with the other mode.

> **Note**  
> The button will be red if activate it will disable the event, and green if it will enable it.

### Follow

Allow to only "ping" specific channels or roles.

You need to activate the `follow-only` mode to use these commands. You can do that with the `/config` command.

- `/follow channel [channel]` : Add a channel to the list of followed channels
- `/follow role [role]` : Add a role to the list of followed roles
- `/follow specific [role] [channel]` : Add a role to the list of followed roles in a specific channel.
  - You can repeat the command with the same role to add multiple channels.
  - To remove a channel, you need to redo the command with the same channel and role.
  - To remove a role completely, you need to do the command without the channel.
- `/follow list` : List all followed channels and roles

> **Note**  
> To unfollow a channel/role, you need to redo the command with the same channel/role.

### Ignore

The exact opposite of the follow command. It won't ping the channels or roles ignored.

- `/ignore channel [channel]` : Add a channel to the list of ignored channels
- `/ignore role [role]` : Add a role to the list of ignored roles
- `/ignore specific [role] [channel]` : Add a role to the list of ignored roles in a specific channel
  - You can repeat the command with the same role to add multiple channels.
  - To remove a channel, you need to redo the command with the same channel and role.
  - To remove a role completely, you need to do the command without the channel.
- `/ignore list` : List all ignored channels and roles

> **Note**  
> To un-ignore a channel, you need to redo the command with the same channel. Same for the role.

> **Warning**  
> You can't follow and ignore "role" or "channel" at the same time.
> For example:
>
> - If the `only-channel` mode is activated, you can't ignore a channel.
> - If the `only-role` mode is activated, you can't ignore a role.
>   Factually, the `follow` commands will ignore all un-specified channels/roles.

### Update

If you want to manually update a thread, you can use the slash commands:

- `/update thread (thread)` : Update a specific thread. If the thread is not specified, it will update the current thread.
- `/update all` : Update all threads in the server
- `/update help` : Get help about the manual slash commands

These commands don't appear for user that haven't the `manage thread` permission.

> **Warning**  
> It will re-add all users that leave the thread, even if they left it on purpose.

> **Note**  
> There is no way that I can code something that don't add any notification on the thread.
> You **always** will have the thread that becomes white when the bot activates.

More over, you can configure the bot and disable event that you don't want to use. You can do that with the `/config` command. You can see the configuration with `/config show`

### Info

A simple embed with some information about the bot and the main developer.

## How it's work

For some optimization purpose, the bot will first @role when a thread must be updated. After it will check if some users (that don't have role/allowed role) can see the thread and add them.
Moreover, if there is no role in the server, the bot process on the members list instead.

Note that role will be mentioned if some users that have the role aren't in the thread.

After making the list of user/role to ping, there is two possibility:

- If a older message of the bot exists, it will edit it with the new list of user/role to ping.
- If not, it will send a empty message (with `_ _`) and edit it with the new list of user/role to ping.

After sending/editing the message, the bot will edit the message again to `_ _`.

> **Warning**  
> The message send won't be deleted, because I discover that if a ping with editing an old message doesn't make a notification.
> So the bot will keep this message to edit it when the thread need to be updated.
> With that, user already in the thread won't get a white notification on the thread.

### Permission asked

The bot needs some intents to work:

- Presence
- Server members

(For some reason, the bot needs the presence intents to get the user id when they join the server)

---

# 🤖 Development

The bot is made with [discord.js](https://discord.js.org/#/). You need to have [node.js (LTS)](https://nodejs.org/en/) installed on your computer.
After cloning the repo, you need to install the dependencies with:

```bash
npm run init
```

The script will ask your for your `.env` variable, and the file will be created automatically.
It can look like this:

```dotenv
BOT_TOKEN=your_token
CLIENT_ID=your_client_id
NODE_ENV=development# or production
MESSAGE= #Anything you want
GITHUB_EMOJI="1125070935855222845" #Emoji ID
KOFI="1125071623658164274" #Emoji ID
DISCORD="1125072006937849876" #Emoji ID
```

> **Note**  
> If you want try your bot, you need to create an application in the [discord developer portal](https://discord.com/developers/applications).
> [Here a tutorial](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token)
> Don't forget to invite your bot in a testing discord server!

- `BOT_TOKEN` is the token of the bot that you can get in `Bot` > `Reset token` in the discord developer portal.
- `CLIENT_ID` is the client id of the bot, you can get it from `General Information` > `Client ID` in the discord developer portal.
- `NODE_ENV` is the environment of the bot. It can be `development` or `production`. If you are in development, the bot will log a lot of event. If you are in production, the bot will log only errors.
- `MESSAGE` : The message you want to send when waiting for the list of users/roles. You can use a simple message, an emoji, stickers or external emoji. Beware of them. The bot must be on the server where the emoji is (but it can use it everywhere).

The bot uses Enmap to store data. You can find the documentation [here](https://enmap.evie.dev/). You need a special installation for it, so follow the instructions [here](https://enmap.evie.dev/install).

## 🎼 Translation

The bot is translated in:

- [x] French
- [x] English

I use i18next to translate the bot. You can find the documentation [here](https://www.i18next.com/).

If you want to add a translation, you need to:

- Duplicate `src/i18next/locales/en.json` and rename it with the language code (ex: `fr.json`)
- Translate the file
- Update the `src/i18next/index.ts` and add the language in the `ressources` object, without forgetting to import it (ex: `import * as fr from "./locales/fr.json";`)
- You need to update **all** commands (`src/commands`) file, and update:
  - Adding `const lang = i18next.getFixedT("lang");` at the top of the file
  - Adding `setNameLocalizations({lang: lang("same key of other langue")})`
  - Adding the language directly in `setDescriptionLocalizations`.
    You can get more information about [commands localization on the official discordJS documentation](https://discordjs.guide/slash-commands/advanced-creation.html#localizations)
    The slash commands language is directly based on your discord client language.

---

# Thread Watcher

A cool bot to use with this bot is [Thread Watcher](https://threadwatcher.xyz/)!
