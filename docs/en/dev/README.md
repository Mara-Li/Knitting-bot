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

> [!NOTE]  
> If you want try your bot, you need to create an application in the [discord developer portal](https://discord.com/developers/applications).
> [Here a tutorial](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token)
> Don't forget to invite your bot in a testing discord server!

- `BOT_TOKEN` is the token of the bot that you can get in `Bot` > `Reset token` in the discord developer portal.
- `CLIENT_ID` is the client id of the bot, you can get it from `General Information` > `Client ID` in the discord developer portal.
- `NODE_ENV` is the environment of the bot. It can be `development` or `production`. If you are in development, the bot will log a lot of event. If you are in production, the bot will log only errors.
- `MESSAGE` : The message you want to send when waiting for the list of users/roles. You can use a simple message, an emoji, stickers or external emoji. Beware of them. The bot must be on the server where the emoji is (but it can use it everywhere).

The bot uses Enmap to store data. You can find the documentation [here](https://enmap.evie.dev/). You need a special installation for it, so follow the instructions [here](https://enmap.evie.dev/install).