# How it's work

For some optimization purpose, the bot will first @role when a thread must be updated. After it will check if some users (that don't have role/allowed role) can see the thread and add them.
Moreover, if there is no role in the server, the bot process on the members list instead.

Note that role will be mentioned if some users that have the role aren't in the thread.

After making the list of user/role to ping, there is two possibility:

- If a older message of the bot exists, it will edit it with the new list of user/role to ping.
- If not, it will send a empty message (with `_ _`) and edit it with the new list of user/role to ping.

After sending/editing the message, the bot will edit the message again to `_ _`.

> [!WARNING]  
> The message send won't be deleted, because I discover that if a ping with editing an old message doesn't make a notification.
> So the bot will keep this message to edit it when the thread need to be updated.
> With that, user already in the thread won't get a white notification on the thread.