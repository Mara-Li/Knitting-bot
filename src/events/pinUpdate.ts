import type { Client, TextBasedChannel } from "discord.js";

export default (client: Client): void => {
	client.on(
		"channelPinsUpdate",
		async (channel: TextBasedChannel, time: Date | number) => {
			//fetch the system message that triggered the pin update
			const timeNb = typeof time === "number" ? time : time.getTime();
			const systemMessage = (await channel.messages.fetch()).find((msg) => {
				return msg.system && msg.createdTimestamp >= timeNb - 5000;
			});
			if (systemMessage && systemMessage.author === client.user)
				await systemMessage.delete();
		}
	);
};
