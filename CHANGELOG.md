# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [2.3.0](https://github.com/Mara-Li/Knitting-bot/compare/2.2.0...2.3.0) (2024-11-25)


### Features

* set language based to the user interaction ([9155ca2](https://github.com/Mara-Li/Knitting-bot/commit/9155ca221a660a35326009e4bdd7b5a3c2016690))
* set language for logs ([c5813fe](https://github.com/Mara-Li/Knitting-bot/commit/c5813fe5e0138b68c8ef238d5f3e77aec2db8d82))
* use cmdLn instead of manually each lang ([e92ca4f](https://github.com/Mara-Li/Knitting-bot/commit/e92ca4f93c240cf2b7724a54f59b4b6839ed9254))
* use cmdLn instead of manually each lang ([a3e39ef](https://github.com/Mara-Li/Knitting-bot/commit/a3e39ef8ad9ad7bd75c92490a1385f8e835380cd))


### Bug Fixes

* command value not found ([e83bc9c](https://github.com/Mara-Li/Knitting-bot/commit/e83bc9c24aaec4c171db893a6343775175a1ae31))
* do not revive old threads (archived), only add user to existing thread ([24d3d8d](https://github.com/Mara-Li/Knitting-bot/commit/24d3d8d38dfd2665d3d68111be51c7982da087ef))
* remove useless cmd ([07ee896](https://github.com/Mara-Li/Knitting-bot/commit/07ee8961ff40ac692e9a8280c08e859231df4240))

## [2.2.0](https://github.com/Lisandra-dev/DiscordThreadMember/compare/2.1.0...2.2.0) (2023-07-14)


### Features

* add logs ([69e6691](https://github.com/Lisandra-dev/DiscordThreadMember/commit/69e66918b49529571eedf329f8da31965246cc85))


### Bug Fixes

* **index:** fix import path ([2e84399](https://github.com/Lisandra-dev/DiscordThreadMember/commit/2e84399e330f008abd478944790143b0d4257d92))
* **listener:** automatically join the bot to the thread ([7eb2cd5](https://github.com/Lisandra-dev/DiscordThreadMember/commit/7eb2cd52de6ae6360c552177aa60b129e6de76b4))
* **listener:** member update logs ([d09bf11](https://github.com/Lisandra-dev/DiscordThreadMember/commit/d09bf1126417fbbaf13b1719f810b263e5168d8c))
* **maps:** the key doesn't exist on configuration map ([0a5c6ae](https://github.com/Lisandra-dev/DiscordThreadMember/commit/0a5c6ae4c40d17c763105bb1096c88b5fa085e80))
* user not added in thread ([efd0b3f](https://github.com/Lisandra-dev/DiscordThreadMember/commit/efd0b3fdc92ddbbcc29aef5d5a1ccbfc7160d8e1))

<a name="v2.1.0"></a>
## [v2.1.0](https://github.com/Lisandra-dev/Knitting-bot/compare/2.0.0...v2.1.0) (2023-07-08)

### Chore

* **VERSION:** update VERSION
* **dep:** update dependancies

### Feat

* add tslib dependency
* **info.ts:** add localization for bot information command ([#2](https://github.com/Lisandra-dev/Knitting-bot/issues/2)b5443cc)
* **maps:** Refactor setting and getting config values

### Fix

* **channelType:** improve channel check logic
* **language:** lang reset when ready
* **utils:** fix condition check in getUsersToPing function

### Refactor

* Remove unnecessary imports and fix import order
* Simplify role adding logic in getRoleToPing function
* use console log for important command info
* **commands:** reorganize import statements

### Style

* format imports in follow.ts


<a name="2.0.0"></a>
## [2.0.0](https://github.com/Lisandra-dev/Knitting-bot/compare/1.2.4...2.0.0) (2023-07-04)

### Chore

* **VERSION:** update VERSION

### Fix

* **db:** remove db on guild removed also load db for first time when added
* **db:** reconfigure completely the db

### Refactor

* remove unused import & redundant variable

### BREAKING CHANGE


the db must be destroyed, removing ALL change from user


<a name="1.2.4"></a>
## [1.2.4](https://github.com/Lisandra-dev/Knitting-bot/compare/1.2.2...1.2.4) (2023-07-03)

### Chore

* add prerestart
* update version number
* **VERSION:** update VERSION
* **dep:** update version

### Docs

* add config commands

### Feat

* **config:** rework embed to have cleaner menu

### Fix

* **config:** prevent double interaction if two cmd are send
* **config:** "auto" not recognized

### Refactor

* add version number to console.info
* **translation:** better french button name


<a name="1.2.2"></a>
## [1.2.2](https://github.com/Lisandra-dev/Knitting-bot/compare/1.2.1...1.2.2) (2023-07-02)

### Chore

* bump v1.2.1
* **install:** update new value
* **package:** start wrong place

### Docs

* add info about forum
* change hierarchy title
* add info about /config
* add new .env

### Fix

* forgot "category" permission and forum permission edited
* update commands name for role-in

### Refactor

* **style:** some embeds adjustement


<a name="1.2.1"></a>
## [1.2.1](https://github.com/Lisandra-dev/Knitting-bot/compare/1.2.0...1.2.1) (2023-07-02)

### Chore

* **VERSION:** update VERSION
* **version:** get version from package


<a name="1.2.0"></a>
## [1.2.0](https://github.com/Lisandra-dev/Knitting-bot/compare/1.1.0...1.2.0) (2023-07-02)

### Chore

* **release:** edit generating release
* **version:** update version

### Feat

* add info command


<a name="1.1.0"></a>
## 1.1.0 (2023-07-02)

### Chore

* ignore database by emap
* rename bot & desc
* Add LICENSE
* remove idea folder
* **changelog:** add create release
* **dep:** use pnpm
* **init:** installation script for dev
* **release:** update file name
* **release:** add config

### Ci

* better time format
* add time to log
* add pm2 cmd
* use pm2 to keep bot alive

### Docs

* add info about node version
* add description to function
* add info about the white notif and message not deleted
* add info sur role-in
* fix typo
* localization
* update readme + /update help
* fix two whitespace
* add info about configuration edit with slash commands
* add translation info in README
* explain the bot purpose
* add link to thread watcher
* add french translation
* add server links to knitting
* don't remove user
* warning about commands
* add "onbotjoin" info
* add permission + dev info
* improve docs with information about ping
* **Enmap:** add Enmap info
* **README:** update readme with the new features
* **intern:** add links to structure

### Feat

* add helps for commands using `/update help`
* onThreadUpdated & Created
* add custom message for loading
* ignore Role in Thread
* onMemberUpdate, trigger only when role change
* follow role in thread
* only-role and only-channel modes
* check if channel/category/thread is ignored for the update / followed
* check ignored channels
* add message info
* allow to ignore & display
* move ignore to they own commands, added role ignore
* don't update if thread is excluded
* introduce ignore commands
* allow to delete a role without chan
* optimize function
* add function
* translation commands name
* mode manual and show config directly in config commands
* add translation to slash commands
* add configuration slash commands
* manage commands to set permission
* add NODE_ENV for log
* add slash commands to manually update thread
* optimize add member by using first the role
* auto add to thread when bot is added to the serv
* no ping !
* add new member to thread they can see
* **config:** use a button menu for configuration
* **improvement:** keep the message and edit it for adding user to thread Prevent ping/ghost ping
* **translation:** add translation for roleIn feature

### Fix

* french translation missing key
* forgot that ping send a notification, return to emoji
* use await for thread.members.add
* remove user when role change
* prevent crash when bot is kick
* prevent user without role to use the commands
* multiple ping/message when one can be used
* french translation broken
* in some case, user are considered like "ignored"
* rework translation
* redondant check
* toIgnore has type not related to CategoryChannel thanks webstorm
* check if channel/category/thread is ignored for the update
* use another way to loads commands
* rename emoji to message for env variable
* add color for log
* update log for using environment variable
* message for online
* discord only love lowercase
* upgrading translation using i18next and fixedT
* crash config when value is undefined
* forgot to remove old commands when loading
* changing language
* wrong environment created
* message for online
* **config:** forgot translation
* **i18n:** update config show & translation
* **interaction:** send a message in codeblocks with error
* **optimize:** send the message only if there are role to add
* **translation:** some string was forgotten
* **translation:** add translation
* **translation:** invalid string length I hate french
* **translation:** formatting broken
* **typeError:** convert to number

### Refactor

* log
* remove unused embed
* remove duplicate translation
* rename threadUpdate to channelUpdate
* rename slash commands
* add log
* improve message logging
* remove unused keys
* add translation for new commands
* remove unused function
* remove useless logging
* add logs for commands loading in serv
* fusion "ignore" and "follow" function and use string to know which one is used
* remove unused import
* remove emoji/message
* remove unused import
* optimization with get allMember/role to add and thereafter edit the message with the complete list
* remove useless files
* remove useless import
* remove useless files
* **eslint:** no explicit any disable
* **move:** create file for each type of things
* **optimize:** move some redondant to their own function
* **translation:** move strings
* **translation:** translation string

### Style

* **eslint:** fix whitespace and quote
* **eslint:** endlines
* **eslint:** fix
* **eslint:** update eslint to ignore js
* **eslint:** fix
* **import:** style import
