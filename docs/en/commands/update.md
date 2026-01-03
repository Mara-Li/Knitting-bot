# Update

If you want to manually update a thread, you can use the slash commands:

- `/update thread (thread)` : Update a specific thread. If the thread is not specified, it will update the current thread.
- `/update all (archived?)` : Update all threads in the server. Use the `archived` option to include archived threads.
- `/update help` : Get help about the manual slash commands

These commands don't appear for user that haven't the `manage thread` permission.

> [!WARNING]  
> It will re-add all users that leave the thread, even if they left it on purpose.

> [!NOTE]  
> There is no way that I can code something that don't add any notification on the thread.
> You **always** will have the thread that becomes white when the bot activates.

More over, you can configure the bot and disable event that you don't want to use. You can do that with the `/config` command. You can see the configuration with `/config show`