import * as Djs from "discord.js";
import { getUl } from "../i18n";
import { INFO_EMOJI, VERSION } from "../index";
import "../discord_ext.js";

export default {
	data: new Djs.SlashCommandBuilder().setName("info").setDescriptions("info.cmds"),
	async execute(interaction: Djs.CommandInteraction) {
		if (!interaction.guild) return;
		const ul = getUl(interaction);

		const embed = new Djs.EmbedBuilder()
			.setTitle(ul("info.title"))
			.setDescription(
				`${ul("info.desc")}\n\n${ul("configuration.show.menu.description")}`
			)
			.setThumbnail(interaction.client.user.displayAvatarURL())
			.setColor("#4c8cb9")
			.addFields({
				name: "Version",
				value: VERSION as string,
			})
			.addFields({
				name: `${ul("configuration.log.name")}`,
				value: `\`/config ${ul("configuration.menu.log.channel.title")}\``,
			})
			.addFields({ name: "\u200A", value: "\u200A" })
			.addFields({
				name: ul("configuration.menu.mode.title"),
				value: `\`/config ${ul("configuration.menu.mode.title").toLowerCase()}\``,
			})
			.addFields({ name: "\u200A", value: "\u200A" })
			.addFields({
				name: ul("configuration.menu.autoUpdate.title"),
				value: `\`/config ${ul("configuration.menu.autoUpdate.cmd").toLowerCase()}\``,
			})
			.setFooter({
				text: ul("info.footer"),
			});

		/**
		 * Create button with external link
		 */

		const row = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
			new Djs.ButtonBuilder()
				.setLabel("GitHub")
				.setURL(`${ul("info.readMe")}`)
				.setEmoji({
					id: INFO_EMOJI.github,
				})
				.setStyle(Djs.ButtonStyle.Link),
			new Djs.ButtonBuilder()
				.setLabel("Kofi")
				.setURL("https://ko-fi.com/mara__li")
				.setEmoji({
					id: INFO_EMOJI.kofi,
				})
				.setStyle(Djs.ButtonStyle.Link),
			new Djs.ButtonBuilder()
				.setLabel("Discord")
				.setURL("https://discord.gg/TWjfz2yTSA")
				.setEmoji({
					id: INFO_EMOJI.discord,
				})
				.setStyle(Djs.ButtonStyle.Link),
			new Djs.ButtonBuilder()
				.setLabel("Changelog")
				.setURL("https://github.com/mara-li/Knitting-bot/blob/master/CHANGELOG.md")
				.setEmoji("🕒")
				.setStyle(Djs.ButtonStyle.Link)
		);

		await interaction.reply({ components: [row], embeds: [embed] });
	},
};
