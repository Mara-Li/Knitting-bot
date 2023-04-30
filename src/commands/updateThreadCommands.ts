import { CommandInteraction, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";

export default {
	data: new SlashCommandBuilder()
		.setName("global")
		.setDescription("Update all thread in this server, with adding or removing user"),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const threads = interaction.guild.channels.cache.filter(channel => channel.isThread());
		await interaction.reply({ content: "Updating all threads", ephemeral: true });
		for (const thread of threads.values()) {
			const threadChannel = thread as ThreadChannel;
			await addRoleAndUserToThread(threadChannel);
		}
	}
};
