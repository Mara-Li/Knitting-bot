# How it's work

For some optimization purpose, the bot will first `@role` when a thread must be updated. After it will check if some users (that don't have role/allowed role) can see the thread and add them.
Moreover, if there is no role in the server, the bot process on the members list instead.

Note that role will be mentioned if some users that have the role aren't in the thread.

After making the list of user/role to ping, there is two possibility:
- If a older message of the bot exists, it will edit it with the new list of user/role to ping.
- If not, it will send a new message with the configured *placeholder*[^1] (to avoid pinging user) and then modify it with the list.

After sending/editing the message, the bot will modify the message using the configured *placeholder*.

> [!WARNING]
> The message will therefore not be deleted, because mentioning a user in an old message did not generate a “white” notification.
> So, the bot will keep the messages to edit them if the thread needs to be updated. To avoid having to systematically search for the message, the bot will keep the message ID in a database.
> With this, old users will not receive any notifications at all.

[^1]: `_ _` by default