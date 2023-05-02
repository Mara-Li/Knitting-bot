import { CommandInteraction, SlashCommandBuilder, ThreadChannel, PermissionFlagsBits  } from "discord.js";
import { addRoleAndUserToThread } from "../utils";

export default {
	data: new SlashCommandBuilder()
		.setName("update-thread")
		.setDescription("Update this thread with adding missing users")
		.setDescriptionLocalizations({
			fr: "Met à jour ce thread en ajoutant les utilisateurs manquants",
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),
	async execute(interaction: CommandInteraction) {
		//check if user has permission to update thread
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
