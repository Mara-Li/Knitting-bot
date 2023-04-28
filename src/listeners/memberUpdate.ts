import { Client, ThreadMember } from 'discord.js';
import { TextChannel, ThreadChannel } from 'discord.js';

export default (client: Client): void => {
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        console.log(`${oldMember.user.username} has been updated!`);
        const guild = newMember.guild;
        const memberTotal = guild.memberCount;
        const channels = guild.channels.cache.filter(channel => channel.isThread());
        for (const channel of channels.values()) {
            const ThreadChannel = channel as ThreadChannel;
            const threadMembers = await ThreadChannel.members.fetch();
            const threadMemberArray: ThreadMember<boolean>[] = [];
            threadMembers.forEach(member => {
                threadMemberArray.push(member);
            });
        }
    });
};
