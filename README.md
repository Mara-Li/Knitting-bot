## Knitting

A bot that helps you to add user to a thread, to keep the thread always visible for everyone, and without pinging them!  

> **Note**  
> The user added to the thread needs to have the permission to see it.  

The bot will automatically add a user to a thread when: 
- A user joins the server and has the permission to see the thread
- A user is updated and gets a new role
- When a channel or category that have their permission edited
- When a thread is created
- When the bot joins the server. Note that it needs the permissions to see the thread to add members.

For some optimization purpose, the bot will first @role when a thread is created (or when it joins a server). After it will check if some users (that don't have role/allowed role) can see the thread and add them.
Moreover, if there is no role in the server, the bot process on the members instead.

> It will avoid to iterate and mention all members of the server.

> **Note**  **How adding work ?**  
> The bot will send a message containing "//", edit it (so no mention because of editing message) and then delete it.
> As the user was mentioned, the thread will be visible for them.  
> Only one message will be sent: the same message will be edited for each user/roles, preventing sending a lot of message.

### Permission asked

The bot needs some intents to work:
- Presence
- Server members

(For some reason, the bot needs the presence intents to get the user id when they join the server)

[Invitation links](https://discord.com/api/oauth2/authorize?client_id=1101559076086886500&permissions=292057785360&scope=bot)

If you want to try out the bot, you can join [this discord server](https://discord.gg/TWjfz2yTSA)!

### Slash Commands

If, for some reason, the bot doesn't update the thread, you have three commands : 
- `/update-specific-thread [thread]` : Update a specific thread
- `/update-all-threads` : Update all threads in the server
- `/update-thread` : Update the thread where the command is used

These commands don't appear for user that doesn't have the `manage thread` permission.

> **Warning**  
> It will re-add all users that leave the thread, even if they left it on purpose.

> **Note**
> There is no way that I can code something that don't add any notification (aka white border) on the thread.
> You **always** will have the thread that become white when the bot activate. 

More over, you can configure the bot and disable event that you don't want to use. You can do that with the `/config` command. You can see the configuration with `/config-show`

---

## Thread Watcher

A cool bot to use with this bot is [Thread Watcher](https://threadwatcher.xyz/)!

---

## 🤖 Development 

The bot is made with [discord.js](https://discord.js.org/#/). You need to have [node.js](https://nodejs.org/en/) installed on your computer.
After cloning the repo, you need to install the dependencies with:
```bash
npm run init
```

The script will ask you for the bot token. You can get it on the [discord developer portal](https://discord.com/developers/applications).

By the way, the `.env` file must looks like that:
```
BOT_TOKEN=your_token
CLIENT_ID=your_client_id
NODE_ENV=development # or production
```

The last part is for logging. In production, nothing (unless error) is recorded. In development, the bot will log everything in the console.

The bot uses Enmap to store data. You can find the documentation [here](https://enmap.evie.dev/). You need a special installation for it, so follow the instructions [here](https://enmap.evie.dev/install).
