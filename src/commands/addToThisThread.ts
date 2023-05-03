import { CommandInteraction, SlashCommandBuilder, ThreadChannel, PermissionFlagsBits  } from "discord.js";
import { addRoleAndUserToThread } from "../utils";
import { default as i18next } from "../i18n/i18next";
const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");



export default {
	data: new SlashCommandBuilder()
		.setName(en("commands.updateThread.name"))
		.setDescription(en("commands.updateThread.description"))
		
		.setDescriptionLocalizations({
			fr: fr("commands.updateThread.description"),
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),
	async execute(interaction: CommandInteraction) {
		//check if user has permission to update thread
		if (!interaction.channel || !(interaction.channel instanceof ThreadChannel)) {
			await interaction.reply({ content: i18next.t("commands.error") as string, ephemeral: true });
			return;
		}
		try {
			await interaction.reply({ content: `${i18next.t("commands.success", {channel: interaction.channel.name}) as string}`, ephemeral: true});
			const thread = interaction.channel as ThreadChannel;
			await addRoleAndUserToThread(thread);
		}
		catch (e) {
			console.error(e);
			await interaction.reply({ content: i18next.t("error", {error: e}) as string, ephemeral: true });
		}
	}
};
