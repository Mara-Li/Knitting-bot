import {
	CommandInteraction,
	CommandInteractionOptionResolver, EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { default as i18next, languageValue } from "../i18n/i18next";
import { DefaultMenuBuilder } from "../interface";
import { set, CommandName, get } from "../maps";

const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName(en("slash.main.name"))
		.setDescription(
			en("slash.main.description")
		)
		.setDescriptionLocalizations({
			fr: fr("slash.main.description"),
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.language.name"))
				.setNameLocalizations({
					fr: fr("slash.language.name"),
				})
				.setDescription(en("slash.language.description"))
				.setDescriptionLocalizations({
					fr: fr("slash.language.description"),
				})
				.addStringOption((option) =>
					option
						.setName(en("slash.language.name"))
						.setNameLocalizations({
							fr: fr("slash.language.name"),
						})
						.setDescription(en("slash.language.options"))
						.setDescriptionLocalizations({
							fr: fr("slash.language.options"),
						})
						.addChoices(
							{ name: "English", value: "en" },
							{ name: "Français", value: "fr" }
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.show.name"))
				.setNameLocalizations({
					fr: fr("slash.show.name"),
				})
				.setDescription(en("slash.show.description"))
				.setDescriptionLocalizations({
					fr: fr("slash.show.description")
				})
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.disable.name"))
				.setNameLocalizations({
					fr: fr("slash.disable.name"),
				})
				.setDescription(en("slash.disable.description"))
				.setDescriptionLocalizations({
					fr: fr("slash.disable.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("slash.switch"))
						.setDescriptionLocalizations({
							fr: fr("slash.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.member.name"))
				.setNameLocalizations({
					fr: fr("slash.member.name"),
				})
				.setDescription(en("slash.member.description"))
				.setDescriptionLocalizations({
					fr: fr("slash.member.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("slash.switch"))
						.setDescriptionLocalizations({
							fr: fr("slash.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.thread.name"))
				.setNameLocalizations({
					fr: fr("slash.thread.name"),
				})
				.setDescription(
					en("slash.thread.description")
				)
				.setDescriptionLocalizations({
					fr: fr("slash.thread.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("slash.switch"))
						.setDescriptionLocalizations({
							fr: fr("slash.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.channel.name"))
				.setNameLocalizations({
					fr: fr("slash.channel.name"),
				})
				.setDescription(en("slash.channel.description"))
				.setDescriptionLocalizations({
					fr: fr("slash.channel.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("slash.switch"))
						.setDescriptionLocalizations({
							fr: fr("slash.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("slash.newMember.name"))
				.setNameLocalizations({
					fr: fr("slash.newMember.name"),
				})
				.setDescription(
					en("slash.newMember.description")
				)
				.setDescriptionLocalizations({
					fr: fr("slash.newMember.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("slash.switch"))
						.setDescriptionLocalizations({
							fr: fr("slash.switch"),
						})
						.setRequired(true)
				)
		),
	async execute(interaction: CommandInteraction) {
		try {
			const options = interaction.options as CommandInteractionOptionResolver;
			const commands = options.getSubcommand();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const mapsCommands: any = {
				"on-member-update": CommandName.member,
				"on-thread-created": CommandName.thread,
				"on-channel-update": CommandName.channel,
				"on-new-member": CommandName.newMember,
			};
			if (commands === DefaultMenuBuilder.language) {
				const newValue = options.getString(CommandName.language) ?? "en";
				set(CommandName.language, newValue);
				//reload i18next
				await i18next.changeLanguage(newValue);
				await interaction.reply(
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					`${i18next.t("reply.language", { lang: languageValue[newValue] })}`
				);
			} else if (commands === DefaultMenuBuilder.disable) {
				const manualMode = !options.getBoolean("switch");
				for (const command of Object.values(CommandName)) {
					if (command !== CommandName.language) {
						set(command, manualMode);
					}
				}
				const rep = options.getBoolean("switch") ? i18next.t("reply.enabledManual") : i18next.t("reply.disabledManual");
				await interaction.reply({ content: rep, ephemeral: true });
			} else if (commands === DefaultMenuBuilder.channel) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.channel],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === DefaultMenuBuilder.member) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.member],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === DefaultMenuBuilder.newMember) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.newMember],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === DefaultMenuBuilder.thread) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.thread],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === DefaultMenuBuilder.show) {
				await display(interaction);
			} else {
				await display(interaction);
			}
		} catch (e) {
			console.error(e);
			await interaction.reply({
				content: `${i18next.t("error", { error: e })}`,
				ephemeral: true,
			});
		}
	},
};

async function getBooleanAndReply(
	interaction: CommandInteraction,
	option: CommandName,
	value: boolean
) {
	set(option, value);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const optionTranslation: any = {
		onMemberUpdate:
			"**__" + i18next.t("commands.onMemberUpdate").toLowerCase() + "__**",
		onThreadCreated:
			"**__" + i18next.t("commands.onThreadCreated").toLowerCase() + "__**",
		onChannelUpdate:
			"**__" + i18next.t("commands.onChannelUpdate").toLowerCase() + "__**",
		onNewMember:
			"**__" + i18next.t("commands.onNewMember").toLowerCase() + "__**",
	};
	if (value) {
		return interaction.reply({
			content: `${i18next.t("reply.enable", {
				type: optionTranslation[option],
			})}`,
			ephemeral: true,
		});
	} else {
		return interaction.reply({
			content: `${i18next.t("reply.disable", {
				type: optionTranslation[option],
			})}`,
			ephemeral: true,
		});
	}
}

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
			{ name: i18next.t("configuration.language"), value: languageValue[get(CommandName.language) as string] },
			{ name: i18next.t("configuration.onChannelUpdate"), value: enabledOrDisabled(get(CommandName.channel))},
			{ name: i18next.t("configuration.onMemberUpdate"), value: enabledOrDisabled(get(CommandName.member)) },
			{ name: i18next.t("configuration.onNewMember"), value: enabledOrDisabled(get(CommandName.newMember)) },
			{ name: i18next.t("configuration.onThreadCreated"), value: enabledOrDisabled(get(CommandName.thread))},
		);
	await interaction.reply({ embeds: [embed], ephemeral: true });
}
