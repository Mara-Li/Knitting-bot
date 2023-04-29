import { Client, ThreadMember, ThreadChannel } from 'discord.js';

export default (client: Client): void => {
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        //trigger only on role change
        if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
        console.log(`${oldMember.user.username} has been updated!`);
        const guild = newMember.guild;
        const channels = guild.channels.cache.filter(channel => channel.isThread());
        for (const channel of channels.values()) {
            const ThreadChannel = channel as ThreadChannel;
            const threadMembers = await ThreadChannel.members.fetch();
            const threadMemberArray: ThreadMember<boolean>[] = [];
            threadMembers.forEach(member => {
                threadMemberArray.push(member);
            });
            //check if user not in thread
            if (!threadMemberArray.some(member => member.id === newMember.id)) {
                //check thread permission with user role
                if (ThreadChannel.permissionsFor(newMember).has('ViewChannel')) {
                    //add user to thread
                    ThreadChannel.members.add(newMember);
                    console.log(`Added ${newMember.user.username} to ${ThreadChannel.name}`);
                }
            }
        }
    });
};
