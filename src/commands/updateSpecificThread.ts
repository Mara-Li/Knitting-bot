import { CommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";
import { default as i18next } from "../i18n/i18next";
const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");


export default {
	data: new SlashCommandBuilder()
		.setName(en("commands.updateSpecificThread.name"))
		.setDescription(en("commands.updateSpecificThread.description"))
		.setDescriptionLocalizations({
			fr: fr("commands.updateSpecificThread.description"),
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addChannelOption(option => 
			option.setName(en("commands.updateSpecificThread.option.name"))
				.setDescription(en("commands.updateSpecificThread.option.description"))
				.setDescriptionLocalizations({
					fr: fr("commands.updateSpecificThread.option.description"),
				})
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction) {
		const threadOption = interaction.options.get("thread");
		const channelId = threadOption?.channel?.name;
		await interaction.reply({ content: i18next.t("commands.success", {channel: channelId}) as string, ephemeral: true });
		if (!interaction.guild) return;
		const thread = threadOption?.channel as ThreadChannel;
		if (!thread || !thread.isThread()) {
			await interaction.followUp({ content: i18next.t("commands.updateThread.error") as string, ephemeral: true });
			return;
		}
		await addRoleAndUserToThread(thread);
	}
};
