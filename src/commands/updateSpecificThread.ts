import { CommandInteraction, GuildMember, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";

export default {
	data: new SlashCommandBuilder()
		.setName("specific")
		.setDescription("Update a specific thread (provide thread id)")
		.addChannelOption(option => 
			option.setName("thread")
				.setDescription("Select the thread you want to update")
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction) {
		const threadOption = interaction.options.get("thread");
		const channelId = threadOption?.channel?.name;
		await interaction.reply({ content: `Updating ${channelId}`, ephemeral: true });
		if (!interaction.guild) return;
		const thread = threadOption?.channel as ThreadChannel;
		if (!thread || !thread.isThread()) {
			await interaction.followUp("Please select a valid thread channel.");
			return;
		}
		const user = interaction.member as GuildMember;
		if (!user.permissions.has("ManageThreads")){
			await interaction.reply({ content: "You don't have permission to update this thread", ephemeral: true });
			return;
		}
		await addRoleAndUserToThread(thread);
	}
};
