## Knitting

→  [Traduction française](README_FR.md)

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

### Slash Commands

If you want to manually update a thread, you can use the slash commands: 
- `/update thread [thread]` : Update a specific thread
- `/update all` : Update all threads in the server
- `/update here` : Update the thread where the command is used

These commands don't appear for user that doesn't have the `manage thread` permission.

> **Warning**  
> It will re-add all users that leave the thread, even if they left it on purpose.

> **Note**  
> There is no way that I can code something that don't add any notification on the thread.
> You **always** will have the thread that becomes white when the bot activates. 

More over, you can configure the bot and disable event that you don't want to use. You can do that with the `/config` command. You can see the configuration with `/config show`

#### Configuration 

The slash command `/config` allows you to configure the bot. You can: 
- Change the language (English or French)
- Disable/Enable all events (new members, members update permission, new thread created or channel/category permission update).
- It is possible to disable all events with `/config manual-mode`. In this mode, you need to use the slash commands to update the threads.

### How it's work

The bot will send a message containing "//", edit it with the list of users/roles that can see the thread, and then delete the message. As the user was mentioned, the thread will be visible for them, and only **one** message will be sent.

For some optimization purpose, the bot will first @role when a thread must be updated. After it will check if some users (that don't have role/allowed role) can see the thread and add them.
Moreover, if there is no role in the server, the bot process on the members list instead.

Note that role will be mentioned if some users that have the role aren't in the thread. 

### Permission asked

The bot needs some intents to work:
- Presence
- Server members

(For some reason, the bot needs the presence intents to get the user id when they join the server)

---

## 🤖 Development 

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
NODE_ENV=development # or production
MESSAGE= #N'importe quoi
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

## Thread Watcher

A cool bot to use with this bot is [Thread Watcher](https://threadwatcher.xyz/)!
