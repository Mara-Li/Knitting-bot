import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { default as i18next, languageValue } from "../i18n/i18next";
import { DefaultMenuBuilder, CommandName } from "../interface";
import { setConfig, getConfig } from "../maps";

const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName(en("configuration.main.name"))
		.setDescription(en("configuration.main.description"))
		.setDescriptionLocalizations({
			fr: fr("configuration.main.description"),
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.language.name").toLowerCase())
				.setNameLocalizations({
					fr: fr("configuration.language.name").toLowerCase(),
				})
				.setDescription(en("configuration.language.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.language.description"),
				})
				.addStringOption((option) =>
					option
						.setName(en("configuration.language.name").toLowerCase())
						.setNameLocalizations({
							fr: fr("configuration.language.name").toLowerCase(),
						})
						.setDescription(en("configuration.language.options"))
						.setDescriptionLocalizations({
							fr: fr("configuration.language.options"),
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
				.setName(en("configuration.show.name"))
				.setNameLocalizations({
					fr: fr("configuration.show.name"),
				})
				.setDescription(en("configuration.show.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.show.description"),
				})
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.disable.name"))
				.setNameLocalizations({
					fr: fr("configuration.disable.name"),
				})
				.setDescription(en("configuration.disable.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.disable.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.follow.role.name"))
				.setNameLocalizations({
					fr: fr("configuration.follow.role.name"),
				})
				.setDescription(en("configuration.follow.role.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.follow.role.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription("Only follow role and update all channels")
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.follow.thread.name"))
				.setNameLocalizations({
					fr: fr("configuration.follow.thread.name"),
				})
				.setDescription(en("configuration.follow.thread.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.follow.thread.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.roleIn.name"))
				.setDescription(en("configuration.roleIn.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.roleIn.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"), })
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.member.name"))
				.setNameLocalizations({
					fr: fr("configuration.member.name"),
				})
				.setDescription(en("configuration.member.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.member.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.thread.name"))
				.setNameLocalizations({
					fr: fr("configuration.thread.name"),
				})
				.setDescription(en("configuration.thread.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.thread.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.channel.name"))
				.setNameLocalizations({
					fr: fr("configuration.channel.name"),
				})
				.setDescription(en("configuration.channel.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.channel.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.newMember.name"))
				.setNameLocalizations({
					fr: fr("configuration.newMember.name"),
				})
				.setDescription(en("configuration.newMember.description"))
				.setDescriptionLocalizations({
					fr: fr("configuration.newMember.description"),
				})
				.addBooleanOption((option) =>
					option
						.setName("switch")
						.setDescription(en("configuration.switch"))
						.setDescriptionLocalizations({
							fr: fr("configuration.switch"),
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
				"follow-only-role" : CommandName.followOnlyRole,
				"follow-only-channel" : CommandName.followOnlyChannel,
				"follow-only-in": CommandName.followOnlyRoleIn
			};
			if (commands === DefaultMenuBuilder.language) {
				const newValue = options.getString(CommandName.language) ?? "en";
				setConfig(CommandName.language, newValue);
				//reload i18next
				await i18next.changeLanguage(newValue);
				await interaction.reply(
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					`${i18next.t("configuration.language.reply", {
						lang: languageValue[newValue],
					})}`
				);
			} else if (commands === DefaultMenuBuilder.disable) {
				const manualMode = !options.getBoolean("switch");
				for (const command of Object.values(CommandName)) {
					if (command !== CommandName.language) {
						setConfig(command, manualMode);
					}
				}
				const rep = options.getBoolean("switch")
					? i18next.t("enable.manual")
					: i18next.t("disable.manual");
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
			} else if (commands === DefaultMenuBuilder.followOnlyRole) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.followOnlyRole],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === DefaultMenuBuilder.followOnlyChannel) {
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.followOnlyChannel],
					options.getBoolean("switch") ?? false
				);
			} else if (commands === DefaultMenuBuilder.followOnlyRoleIn) {
				if (getConfig(CommandName.followOnlyChannel) || getConfig(CommandName.followOnlyRole)) {
					await interaction.reply({
						content: "You can't combine these options",
						ephemeral: true,
					});
					return;
				}
				await getBooleanAndReply(
					interaction,
					mapsCommands[DefaultMenuBuilder.followOnlyRoleIn],
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
				content: `${i18next.t("common.error", { error: e })}`,
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
	setConfig(option, value);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const optionTranslation: any = {
		onMemberUpdate:
			"**__" + i18next.t("configuration.member.title").toLowerCase() + "__**",
		onThreadCreated:
			"**__" + i18next.t("configuration.thread.title").toLowerCase() + "__**",
		onChannelUpdate:
			"**__" + i18next.t("configuration.channel.title").toLowerCase() + "__**",
		onNewMember:
			"**__" +
			i18next.t("configuration.newMember.title").toLowerCase() +
			"__**",
		followOnlyChannel:
			"**__" +
			i18next.t("configuration.follow.thread.description").toLowerCase() +
			"__**",
		followOnlyRole:
			"**__" +
			i18next.t("configuration.follow.role.description").toLowerCase() +
			"__**",
		followOnlyRoleIn:
			"**__" +
			"Update only for specific role in specific channel" +
			"__**",
	};
	if (value) {
		return interaction.reply({
			content: `${i18next.t("enable.type", {
				type: optionTranslation[option],
			})}`,
			ephemeral: true,
		});
	} else {
		return interaction.reply({
			content: `${i18next.t("disable.type", {
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
	return value ? i18next.t("enable.enable") : i18next.t("common.disabled");
}

/**
 * Display the configuration as an embed
 * @param {CommandInteraction} interaction The interaction that triggered the command
 */
export async function display(interaction: CommandInteraction) {
	const embed = new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.show.menu.title"))
		.setDescription(i18next.t("configuration.show.menu.description"))
		.addFields(
			{
				name: i18next.t("configuration.language.name"),
				value: languageValue[getConfig(CommandName.language) as string]
			})
		
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.follow.role.title"),
				value: enabledOrDisabled(getConfig(CommandName.followOnlyRole)),
				inline: true,
			},
			{
				name: i18next.t("configuration.follow.thread.title"),
				value: enabledOrDisabled(getConfig(CommandName.followOnlyChannel)),
				inline: true,
			},
			{
				name: "Role In",
				value: enabledOrDisabled(getConfig(CommandName.followOnlyRoleIn)),
				inline: true,
			})
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.channel.title"),
				value: enabledOrDisabled(getConfig(CommandName.channel)),
				inline: true,
			},
			{
				name: i18next.t("configuration.member.title"),
				value: enabledOrDisabled(getConfig(CommandName.member)),
				inline: true,
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.newMember.display"),
				value: enabledOrDisabled(getConfig(CommandName.newMember)),
				inline: true,
			},
			{
				name: i18next.t("configuration.thread.display"),
				value: enabledOrDisabled(getConfig(CommandName.thread)),
				inline: true,
			}
		);
	await interaction.reply({ embeds: [embed], ephemeral: true });
}
