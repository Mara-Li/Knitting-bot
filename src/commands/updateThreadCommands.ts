import { CommandInteraction, PermissionFlagsBits, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addRoleAndUserToThread } from "../utils";
import { default as i18next } from "../i18n/i18next";
const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName(en("slash.updateAllThreads.name"))
		.setDescription(en("slash.updateAllThreads.description"))
		.setDescriptionLocalizations({
			fr: fr("slash.updateAllThreads.description")
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const threads = interaction.guild.channels.cache.filter(channel => channel.isThread());
		await interaction.reply({ content: i18next.t("slash.updateAllThreads.reply") as string, ephemeral: true });
		const count = threads.size;
		for (const thread of threads.values()) {
			const threadChannel = thread as ThreadChannel;
			await addRoleAndUserToThread(threadChannel);
		}
		await interaction.followUp({ content: i18next.t("slash.updateAllThreads.success", { count: count }) as string, ephemeral: true });
	}
};
