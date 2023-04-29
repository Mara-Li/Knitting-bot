import { Client, ThreadMember, ThreadChannel } from "discord.js";

export default (client: Client): void => {
	client.on("guildMemberUpdate", async (oldMember, newMember) => {
		//trigger only on role change
		if (oldMember.roles.cache.size === newMember.roles.cache.size) return;
		console.log(`${oldMember.user.username} has been updated!`);
		const guild = newMember.guild;
		const channels = guild.channels.cache.filter(channel => channel.isThread());
		for (const channel of channels.values()) {
			const threadChannel = channel as ThreadChannel;
			const threadMembers = await threadChannel.members.fetch();
			const threadMemberArray: ThreadMember<boolean>[] = [];
			threadMembers.forEach(member => {
				threadMemberArray.push(member);
			});
			//check if user not in thread
			if (!threadMemberArray.some(member => member.id === newMember.id)) {
				//check thread permission with user role
				if (threadChannel.permissionsFor(newMember).has("ViewChannel")) {
					//send a message with mentioning the user
					await threadChannel.members.add(newMember);
					console.log(`Added ${newMember.user.username} to ${threadChannel.name}`);
				}
			} //remove user from thread if not have permission
			else {
				if (!threadChannel.permissionsFor(newMember).has("ViewChannel")) {
					await threadChannel.members.remove(newMember.id);
					console.log(`Removed ${newMember.user.username} from ${threadChannel.name}`);
				}
			}
		}
	});
};
