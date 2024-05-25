import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import i18next from "../i18n/i18next";
import { INFO_EMOJI, VERSION } from "../index";

const en = i18next.getFixedT("en");
const fr = i18next.getFixedT("fr");

export default {
	data: new SlashCommandBuilder()
		.setName("info")
		.setDescription(en("info.cmds"))
		.setDescriptionLocalizations({
			fr: fr("info.cmds"),
		}),
	async execute(interaction: CommandInteraction) {
		const embed = new EmbedBuilder()
			.setTitle(i18next.t("info.title"))
			.setDescription(`${i18next.t("info.desc")}`)
			.setThumbnail(interaction.client.user.displayAvatarURL())
			.setColor("#4c8cb9")
			.addFields(
				{
					name: "Version",
					value: VERSION as string
				}
			)
			.setFooter({
				text: i18next.t("info.footer"),
			});

		/**
		 * Create button with external link
		 */

		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setLabel("GitHub")
					.setURL(`${i18next.t("info.readMe")}`)
					.setEmoji({
						id: INFO_EMOJI.github,
					})
					.setStyle(ButtonStyle.Link),
				new ButtonBuilder()
					.setLabel("Kofi")
					.setURL("https://ko-fi.com/mara__li")
					.setEmoji({
						id: INFO_EMOJI.kofi,
					})
					.setStyle(ButtonStyle.Link),
				new ButtonBuilder()
					.setLabel("Discord")
					.setURL("https://discord.gg/TWjfz2yTSA")
					.setEmoji({
						id: INFO_EMOJI.discord,
					})
					.setStyle(ButtonStyle.Link),
				new ButtonBuilder()
					.setLabel("Changelog")
					.setURL("https://github.com/mara-li/Knitting-bot/blob/master/CHANGELOG.md")
					.setEmoji("🕒")
					.setStyle(ButtonStyle.Link),
			);

		await interaction.reply({ embeds: [embed], components: [row] });
	}
};
