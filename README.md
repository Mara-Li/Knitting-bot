## Knitting

A bot that help you to add user to a thread, to keep the thread always visible for everyone, and without pinging them!  

> **Note**  
> The user added to the thread need to have the permission to see it.  

The bot will automatically add user to a thread when: 
- A user join the server and have the permission to see the thread
- A user is updated and get a new role
- When a channel or category have their permission edited
- When a thread is created

The bot will also remove user that lost the perm to see the thread. Normally, discord will remove the user from the thread, but it's not always the case.  

> **Note**  **How pinging work ?**  
> The bot will send a message containing "//", edit it (so no mention because of editing message) and then delete it.   
> As the user was mentioned, the thread will be visible for them.  

### Permission asked

The bot needs some intents to work:
- Presence
- Server members

(For some reason, the bot need the presence intents to get the user id when they join the server)

[Invitation links](https://discord.com/api/oauth2/authorize?client_id=1101559076086886500&permissions=292057785360&scope=bot)

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
