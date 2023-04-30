import { CommandInteraction, GuildMember, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";

export default {
	data: new SlashCommandBuilder()
		.setName("global")
		.setDescription("Update all thread in this server, with adding or removing user"),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const user = interaction.member as GuildMember;
		if (!user.permissions.has("ManageThreads")){
			await interaction.reply({ content: "You don't have permission to update this thread", ephemeral: true });
			return;
		}
		const threads = interaction.guild.channels.cache.filter(channel => channel.isThread());
		await interaction.reply({ content: "Updating all threads", ephemeral: true });
		for (const thread of threads.values()) {
			const threadChannel = thread as ThreadChannel;
			await addRoleAndUserToThread(threadChannel);
		}
	}
};
