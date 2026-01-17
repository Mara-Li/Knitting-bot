import * as Djs from "discord.js";
import { getUl } from "../i18n";
import "../discord_ext.js";
import db from "../database";
import { INFO_EMOJI, VERSION } from "../interfaces";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("info")
		.setContexts(
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		)
		.setDescriptions("info.cmds"),
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
				name: ul("info.stats.title"),
				value: ul("info.stats.value", {
					guilds: interaction.client.guilds.cache.size,
					latency: interaction.client.ws.ping,
					uptime: Djs.time(
						new Date(Date.now() - interaction.client.uptime!),
						Djs.TimestampStyles.RelativeTime
					),
				}),
			})

			.setFooter({
				text: ul("info.footer"),
			});

		const lang = db.getLanguage(interaction.guild.id).split("-")[0];

		/**
		 * Create button with external link
		 */

		const row = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
			new Djs.ButtonBuilder()
				.setLabel(ul("info.documentation"))
				.setURL(`https://mara-li.github.io/Knitting-bot/#/${lang}/`)
				.setEmoji("📄")
				.setStyle(Djs.ButtonStyle.Link),
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
				.setLabel(ul("info.changelog"))
				.setURL("https://github.com/mara-li/Knitting-bot/blob/master/CHANGELOG.md")
				.setEmoji("🕒")
				.setStyle(Djs.ButtonStyle.Link)
		);

		await interaction.reply({ components: [row], embeds: [embed] });
	},
};
