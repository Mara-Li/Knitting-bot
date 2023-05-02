import {
	CommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder
} from "discord.js";
import { default as i18next } from "../i18n/i18next";
import { get, CommandName } from "../maps";

/**
 * Return the translation if value is true or false
 * @param {boolean} value The value to check
 */
function enabledOrDisabled(value: boolean) {
	return value ? i18next.t("display.enable") : i18next.t("display.disable");
}

/**
 * Display the configuration as an embed
 * @param {CommandInteraction} interaction The interaction that triggered the command
 */
export async function display(interaction: CommandInteraction) {
	const embed = new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.title"))
		.setDescription(i18next.t("configuration.description"))
		.addFields(
			{ name: i18next.t("configuration.language"), value: get(CommandName.language) as string },
			{ name: i18next.t("configuration.onChannelUpdate"), value: enabledOrDisabled(get(CommandName.channel))},
			{ name: i18next.t("configuration.onMemberUpdate"), value: enabledOrDisabled(get(CommandName.member)) },
			{ name: i18next.t("configuration.onNewMember"), value: enabledOrDisabled(get(CommandName.newMember)) },
			{ name: i18next.t("configuration.onThreadCreated"), value: enabledOrDisabled(get(CommandName.thread))},
		);
	await interaction.reply({ embeds: [embed], ephemeral: true });
}



export default {
	data: new SlashCommandBuilder()
		.setName("config-show")
		.setDescription("Display the current bot configuration")
		.setDescriptionLocalizations({
			fr: "Affiche la configuration actuelle du bot",
		}),
	async execute(interaction: CommandInteraction) {
		await display(interaction);
	}
};
