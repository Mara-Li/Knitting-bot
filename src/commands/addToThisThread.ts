import { CommandInteraction, GuildMember, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";

export default {
	data: new SlashCommandBuilder()
		.setName("update")
		.setDescription("Update this thread with adding or removing user"),
	async execute(interaction: CommandInteraction) {
		//check if user has permission to update thread
		const user = interaction.member as GuildMember;
		if (!user.permissions.has("ManageThreads")){
			await interaction.reply({ content: "You don't have permission to update this thread", ephemeral: true });
			return;
		}
		if (!interaction.channel || !(interaction.channel instanceof ThreadChannel)) {
			await interaction.reply({ content: "This is not a thread", ephemeral: true });
			return;
		}
		try {
			await interaction.reply({ content: `Updating thread ${interaction.channel.name}`, ephemeral: true});
			const thread = interaction.channel as ThreadChannel;
			await addRoleAndUserToThread(thread);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: "Something went wrong", ephemeral: true });
		}
	}
};
