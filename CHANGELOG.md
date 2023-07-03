
<a name="v1.2.4"></a>
## [v1.2.4](https://github.com/Lisandra-dev/Knitting-bot/compare/1.2.2...v1.2.4) (2023-07-03)

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

