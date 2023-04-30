import {ChannelType, Client, Snowflake, TextChannel } from "discord.js";
import {
	addRoleAndUserToThread,
} from "../utils";

/**
 * @param {Client} client - Discord.js Client
 * @returns {void}
 * @description This is a listener for channel update event.
 * When the permission of a channel is updated, check if the channel have thread and update them.
 */

export default (client: Client): void => {
	client.on("channelUpdate", async (
		oldChannel,
		newChannel) => {
		console.log(`Channel #${getChannelName(oldChannel.id, client)} updated`);
		if (oldChannel.type !== ChannelType.GuildText
			|| newChannel.type !== ChannelType.GuildText
			|| oldChannel.permissionOverwrites.cache === newChannel.permissionOverwrites.cache) {
			console.log("Channel is not a text channel or permission are not changed");
			return;
		}
		//get all threads of this channel
		console.log(`Updating threads of ${newChannel.name}`);
		const threads = await newChannel.threads.cache;
		//get all role allowed to view the channel
		//const members = await newChannel.guild.members.fetch();
		//filter members that have the permission to view the thread
		//const disallowedMembers = getMemberPermission(members, newChannel, false);
		//add allowed members to the thread, if there are not already in it
		threads.forEach(thread => {
			addRoleAndUserToThread(thread);
			//remove not allowed members from the thread
			//disallowedMembers.forEach(member => {
			//  thread.members.remove(member.id);
			//  console.log(`Remove @${member.user.username} from #${thread.name}`);
			//});
		});
	});
};


/**
 * @description Get the name of a channel
 * @param channelID {Snowflake} - The ID of the channel
 * @param Client {Client} - The Discord.js Client
 */
function getChannelName(channelID: Snowflake, Client: Client) {
	const channel = Client.channels.cache.get(channelID);
	//check if the channel is a text channel
	if (!channel || channel.type !== ChannelType.GuildText) return channelID;
	return (channel as TextChannel).name;
}
