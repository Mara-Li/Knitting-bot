import {
	CommandInteraction,
	CommandInteractionOptionResolver, EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { default as i18next, languageValue } from "../i18n/i18next";
import { set, CommandName, get } from "../maps";

enum CommandsBuilder {
	language = "language",
	member = "on-member-update",
	thread = "on-thread-created",
	channel = "on-channel-update",
	newMember = "on-new-member",
	disable = "manual-mode",
	show = "show",
}

export default {
	data: new SlashCommandBuilder()
		.setName("config")
		.setDescription(
			"Edit the server configuration. Allow to disable / enable some events"
		)
		.setDescriptionLocalizations({
			fr: "Modifie la configuration du serveur. Permet d'activer / désactiver certains évènements",
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.language)
				.setNameLocalizations({
					fr: "langue",
				})
				.setDescription("Change the bot language")
				.setDescriptionLocalizations({
					fr: "Change la langue du bot",
				})
				.addStringOption((option) =>
					option
						.setName(CommandsBuilder.language)
						.setNameLocalizations({
							fr: "langue",
						})
						.setDescription("Language to use")
						.setDescriptionLocalizations({
							fr: "Langue à utiliser",
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
				.setName(CommandsBuilder.show)
				.setNameLocalizations({
					fr: "afficher",
				})
				.setDescription("Show the current configuration")
				.setDescriptionLocalizations({
					fr: "Affiche la configuration actuelle",
				})
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.disable)
				.setNameLocalizations({
					fr: "mode-manuel",
				})
				.setDescription("Disable or enable all events to switch the bot in manual or automatic mode")
				.setDescriptionLocalizations({
					fr: "Active ou désactive tous les évènements pour passer le bot en mode manuel ou automatique",	
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription("Enable or disable the manual mode")
						.setDescriptionLocalizations({
							fr: "Active ou désactive le mode manuel",	
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.member)
				.setDescription("Enable or disable the on member update event")
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'update des threads lors de mise à jour des membres",
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription("Enable or disable this event")
						.setDescriptionLocalizations({
							fr: "Active ou désactive cet évènement",
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.thread)
				.setDescription(
					"Enable or disable the adding of members on thread created event"
				)
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'ajout des membres des threads lors de leur création",
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription("Enable or disable this event")
						.setDescriptionLocalizations({
							fr: "Active ou désactive cet évènement",
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.channel)
				.setDescription(
					"Enable or disable the adding of members on channel update event"
				)
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'ajout des membres des threads lors de leur création",
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription("Enable or disable this event")
						.setDescriptionLocalizations({
							fr: "Active ou désactive cet évènement",
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.newMember)
				.setDescription(
					"Enable or disable the adding of members on new member event"
				)
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'ajout des membres des threads lors de leur création",
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription("Enable or disable this event")
						.setDescriptionLocalizations({
							fr: "Active ou désactive cet évènement",
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
			if (commands === CommandsBuilder.language) {
				const newValue = options.getString(CommandName.language) ?? "en";
				set(CommandName.language, newValue);
				//reload i18next
				await i18next.changeLanguage(newValue);
				await interaction.reply(
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					`${i18next.t("reply.language", { lang: languageValue[newValue] })}`
				);
			} else if (commands === CommandsBuilder.disable) {
				const manualMode = !options.getBoolean("switch");
				for (const command of Object.values(CommandName)) {
					if (command !== CommandName.language) {
						set(command, manualMode);
					}
				}
				const rep = options.getBoolean("switch") ? i18next.t("reply.enabledManual") : i18next.t("reply.disabledManual");
				await interaction.reply({ content: rep, ephemeral: true });
			} else if (commands === CommandsBuilder.channel) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[CommandsBuilder.channel],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === CommandsBuilder.member) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[CommandsBuilder.member],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === CommandsBuilder.newMember) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[CommandsBuilder.newMember],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === CommandsBuilder.thread) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[CommandsBuilder.thread],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === CommandsBuilder.show) {
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
