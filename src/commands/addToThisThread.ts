import { CommandInteraction, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";

export default {
	data: new SlashCommandBuilder()
		.setName("update")
		.setDescription("Update this thread with adding or removing user"),
	async execute(interaction: CommandInteraction) {
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
