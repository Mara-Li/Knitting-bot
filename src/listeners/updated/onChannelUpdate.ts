import { ChannelType, Client, Snowflake, TextChannel } from "discord.js";
import { getConfig } from "../../maps";
import { logInDev } from "../../utils";
import { CommandName } from "../../interface";
import { addRoleAndUserToThread } from "../../utils/add";
import { checkThread } from "../../utils/data_check";

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
		if (getConfig(CommandName.channel) === false) return;
		logInDev(`Channel #${getChannelName(oldChannel.id, client)} updated`);
		logInDev("Channel type :", oldChannel.type, newChannel.type);
		const validChannelTypes : ChannelType[] = [ChannelType.GuildCategory, ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum];
		if (oldChannel.type === ChannelType.DM || newChannel.type === ChannelType.DM) return;
		if (!validChannelTypes.includes(oldChannel.type)
			|| !validChannelTypes.includes(newChannel.type)
			|| oldChannel.permissionOverwrites.cache === newChannel.permissionOverwrites.cache) {
			logInDev("Channel is not a text channel or permission are not changed");
			return;
		}
		//getConfig all threads of this channel
		logInDev(`Updating threads of ${newChannel.name}`);
		const isCategory = newChannel.type === ChannelType.GuildCategory;
		if (isCategory) {
			//get all threads of the channels in the category
			const children = newChannel.children.cache;
			children.forEach(child => {
				if (child.type === ChannelType.GuildText) {
					const threads = (child as TextChannel).threads.cache;
					threads.forEach(thread => {
						if (!getConfig(CommandName.followOnlyChannel)) {
							if (!checkThread(thread, "ignore")) addRoleAndUserToThread(thread);
						} else {
							if (checkThread(thread, "follow")) addRoleAndUserToThread(thread);
						}
					});
				}
			});
		} else {
			const newTextChannel = newChannel as TextChannel;
			const threads = newTextChannel.threads.cache;
			threads.forEach(thread => {
				if (!getConfig(CommandName.followOnlyChannel)) {
					if (!checkThread(thread, "ignore")) addRoleAndUserToThread(thread);
				} else {
					if (checkThread(thread, "follow")) addRoleAndUserToThread(thread);
				}
			});
		}
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
