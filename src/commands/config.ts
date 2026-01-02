/**
 * Configuration menu rework using button
 * Clicking on a button will edit the configuration data:
 * - Enable manual mode {true, false}
 * - follow only-role {true, false}
 * - follow only-channel {true, false}
 * - follow only-role-in {true, false}
 * - Member update {true, false}
 * - Member join {true, false}
 * - Thread created {true, false}
 * - Channel updated
 */
import {
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CacheType,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteractionOptionResolver,
	channelMention,
	EmbedBuilder,
	type Locale,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type StringSelectMenuInteraction,
} from "discord.js";
import { cmdLn } from "../i18n";
import { default as i18next } from "../i18n/init";
import { CommandName } from "../interface";
import { getConfig, setConfig } from "../maps";
import { logInDev } from "../utils";

const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName(en("configuration.main.name"))
		.setNameLocalizations(cmdLn("configuration.main.name"))
		.setDescription(en("configuration.main.description"))
		.setDescriptionLocalizations(cmdLn("configuration.main.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.menu.log.channel.title").toLowerCase())
				.setNameLocalizations(cmdLn("configuration.menu.log.channel.title", true))
				.setDescription(en("configuration.menu.log.desc"))
				.setDescriptionLocalizations(cmdLn("configuration.menu.log.desc"))
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations(cmdLn("common.channel", true))
						.setDescription(en("configuration.menu.log.channel.desc"))
						.setDescriptionLocalizations(cmdLn("configuration.menu.log.channel.desc"))
						.addChannelTypes(
							ChannelType.GuildText,
							ChannelType.AnnouncementThread,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildAnnouncement
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.menu.mode.title").toLowerCase())
				.setNameLocalizations(cmdLn("configuration.menu.mode.title", true))
				.setDescription(en("configuration.menu.mode.desc"))
				.setDescriptionLocalizations(cmdLn("configuration.menu.mode.desc"))
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("locale")
				.setNameLocalizations({
					fr: "langue",
				})
				.setDescription(en("configuration.language.desc"))
				.setDescriptionLocalizations(cmdLn("configuration.language.desc"))
				.addStringOption((option) =>
					option
						.setName("locale")
						.setNameLocalizations({
							fr: "langue",
						})
						.setDescription("locale")
						.setDescriptionLocalizations(cmdLn("configuration.language.options"))
						.setRequired(true)
						.addChoices(
							{
								name: "Français",
								value: "fr",
							},
							{
								name: "English",
								value: "en",
							}
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("configuration.menu.autoUpdate.cmd").toLowerCase())
				.setNameLocalizations(cmdLn("configuration.menu.autoUpdate.cmd", true))
				.setDescription(en("configuration.menu.autoUpdate.desc"))
				.setDescriptionLocalizations(cmdLn("configuration.menu.autoUpdate.desc"))
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;

		const commands = options.getSubcommand();
		if (en("configuration.menu.log.channel.title").toLowerCase() === commands) {
			const channel = options.getChannel(en("common.channel").toLowerCase());
			if (channel) {
				setConfig(`${CommandName.log}.channel`, interaction.guild.id, channel.id);
				await interaction.reply({
					content: i18next.t("configuration.menu.log.channel.success", {
						channel: channelMention(channel.id),
					}) as string,
				});
			} else {
				setConfig(`${CommandName.log}.channel`, interaction.guild.id, false);
				await interaction.reply({
					content: i18next.t("configuration.menu.log.channel.disable"),
				});
			}
		} else if (en("configuration.menu.mode.title").toLowerCase() === commands) {
			// eslint-disable-next-line no-case-declarations
			const row = reloadButtonMode(interaction.guild.id);
			// eslint-disable-next-line no-case-declarations
			const embed = displayModeMenu(interaction.guild.id);
			await interaction.reply({
				components: row,
				embeds: [embed],
			});
		} else if (en("configuration.menu.autoUpdate.cmd").toLowerCase() === commands) {
			const rows = reloadButtonAuto(interaction.guild.id);
			const embeds = autoUpdateMenu(interaction.guild.id);
			await interaction.reply({
				components: rows,
				embeds: [embeds],
			});
		} else if (commands === "locale") {
			const guild = interaction.guild;
			const locale = options.getString("locale", true);
			if (locale === "en") await guild.setPreferredLocale("en-US" as Locale);
			else await guild.setPreferredLocale(locale as Locale);
			await interaction.reply({
				content: `${i18next.t("configuration.language.validate", { lang: (locale as Locale).toUpperCase() })}`,
			});
		}
		// biome-ignore lint/suspicious/noExplicitAny: we don't know the type
		const filter = (i: any) => {
			/** filter on message id */
			return i.user.id === interaction.user.id;
		};
		try {
			const message = await interaction.fetchReply();
			message
				.createMessageComponentCollector({ filter, time: 60000 })
				?.on("collect", async (i) => {
					await i.deferUpdate();
					await updateConfig(
						i.customId as CommandName,
						i as ButtonInteraction<CacheType>
					);
				})
				?.on("end", async () => {
					await interaction.editReply({ components: [] });
				});
		} catch (error) {
			logInDev(error);
			await interaction.editReply({ components: [] });
		}
	},
};

/**
 * Display Mode menu as an embed
 * @returns {@link EmbedBuilder}
 */
function displayModeMenu(guildID: string): EmbedBuilder {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.mode.title"))
		.addFields(
			{
				inline: true,
				name: i18next.t("configuration.follow.role.title"),
				value: enabledOrDisabled(
					getConfig(CommandName.followOnlyRole, guildID) as boolean
				),
			},
			{
				inline: true,
				name: i18next.t("configuration.follow.thread.title"),
				value: enabledOrDisabled(
					getConfig(CommandName.followOnlyChannel, guildID) as boolean
				),
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				inline: true,
				name: i18next.t("configuration.follow.roleIn"),
				value: enabledOrDisabled(
					getConfig(CommandName.followOnlyRoleIn, guildID) as boolean
				),
			},
			{ inline: true, name: "\u200A", value: "\u200A" }
		);
}

function autoUpdateMenu(guildID: string): EmbedBuilder {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.autoUpdate.title"))
		.addFields(
			{
				inline: true,
				name: i18next.t("configuration.channel.title"),
				value: enabledOrDisabled(getConfig(CommandName.channel, guildID) as boolean),
			},
			{
				inline: true,
				name: i18next.t("configuration.member.title"),
				value: enabledOrDisabled(getConfig(CommandName.member, guildID) as boolean),
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				inline: true,
				name: i18next.t("configuration.newMember.display"),
				value: enabledOrDisabled(getConfig(CommandName.newMember, guildID) as boolean),
			},
			{
				inline: true,
				name: i18next.t("configuration.thread.display"),
				value: enabledOrDisabled(getConfig(CommandName.thread, guildID) as boolean),
			}
		);
}

/**
 * Return the translation if value is true or false
 * @param {boolean} value The value to check
 */
function enabledOrDisabled(value: boolean) {
	return value ? i18next.t("common.enabled") : i18next.t("common.disabled");
}

/**
 * Update the configuration and edit the interaction message with the new configuration
 * @param command {@link CommandName}
 * @param interaction
 */
async function updateConfig(
	command: CommandName,
	interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction
) {
	if (!interaction.guild) return;
	let newConfig: string | boolean;
	const commandType = {
		AutoUpdate: [
			CommandName.channel,
			CommandName.member,
			CommandName.newMember,
			CommandName.thread,
			CommandName.manualMode,
		],
		Mode: [
			CommandName.followOnlyRole,
			CommandName.followOnlyChannel,
			CommandName.followOnlyRoleIn,
		],
	};
	const followOnlyRole = getConfig(CommandName.followOnlyRole, interaction.guild.id);
	const followOnlyChannel = getConfig(
		CommandName.followOnlyChannel,
		interaction.guild.id
	);
	const followOnlyRoleIn = getConfig(CommandName.followOnlyRoleIn, interaction.guild.id);
	if (
		(command === CommandName.followOnlyRoleIn && (followOnlyChannel || followOnlyRole)) ||
		(followOnlyRoleIn &&
			(command === CommandName.followOnlyChannel ||
				command === CommandName.followOnlyRole))
	) {
		const embed = displayModeMenu(interaction.guild.id);
		const rows = reloadButtonMode(interaction.guild.id);
		await interaction.editReply({ components: rows, embeds: [embed] });
	} else if (command === CommandName.manualMode) {
		const truc = [
			CommandName.channel,
			CommandName.member,
			CommandName.thread,
			CommandName.newMember,
		];

		const allTruc = truc.map((command) => {
			if (!interaction.guild) return false;
			return getConfig(command, interaction.guild.id);
		});
		const manualMode = allTruc.every((value) => value);
		for (const command of truc) {
			setConfig(command, interaction.guild.id, !manualMode);
		}
		const embed = autoUpdateMenu(interaction.guild.id);
		//reload buttons
		const rows = reloadButtonAuto(interaction.guild.id);
		interaction.editReply({ components: rows, embeds: [embed] });
	} else {
		newConfig = !getConfig(command, interaction.guild.id);
		interaction.editReply({ content: "" });
		setConfig(command, interaction.guild.id, newConfig);
		let embed: EmbedBuilder;
		//reload buttons
		let rows: { type: number; components: ButtonBuilder[] }[];
		if (commandType.Mode.includes(command)) {
			rows = reloadButtonMode(interaction.guild.id);
			embed = displayModeMenu(interaction.guild.id);
		} else {
			rows = reloadButtonAuto(interaction.guild.id);
			embed = autoUpdateMenu(interaction.guild.id);
		}
		interaction.editReply({ components: rows, embeds: [embed] });
	}
}

/**
 * Create a button with the command name as custom id and the label as label
 * @param command {@link CommandName}
 * @param label {string} The label of the button
 * @param guildID
 */

function createButton(command: CommandName, label: string, guildID: string) {
	let style = getConfig(command, guildID) ? ButtonStyle.Danger : ButtonStyle.Success;
	if (command === CommandName.manualMode) {
		const truc = [
			CommandName.channel,
			CommandName.member,
			CommandName.thread,
			CommandName.newMember,
		];
		const allTruc = truc.map((command) => getConfig(command, guildID));
		style = allTruc.some((value) => value) ? ButtonStyle.Danger : ButtonStyle.Success;
	}
	return new ButtonBuilder().setCustomId(command).setStyle(style).setLabel(label);
}

function reloadButtonMode(guildID: string) {
	const translation = {
		[CommandName.followOnlyRoleIn]: i18next.t("configuration.roleIn.name"),
		[CommandName.followOnlyRole]: i18next.t("configuration.follow.role.name"),
		[CommandName.followOnlyChannel]: i18next.t("configuration.follow.thread.name"),
	};

	const buttons: ButtonBuilder[] = [];
	for (const command of [
		CommandName.followOnlyRoleIn,
		CommandName.followOnlyRole,
		CommandName.followOnlyChannel,
	].values()) {
		buttons.push(
			createButton(command, labelButton(command, translation, guildID), guildID)
		);
	}
	if (getConfig(CommandName.followOnlyRoleIn, guildID)) {
		/**
		 * Disable the button if followRoleIn is enable
		 */
		buttons[1] = buttons[1].setDisabled(true);
		buttons[2] = buttons[2].setDisabled(true);
	} else if (
		getConfig(CommandName.followOnlyRole, guildID) ||
		getConfig(CommandName.followOnlyChannel, guildID)
	) {
		/**
		 * Disable the button if followRole or followChannel is enable
		 */
		buttons[0] = buttons[0].setDisabled(true);
	} else {
		/**
		 * Enable all buttons */
		buttons[0] = buttons[0].setDisabled(false);
		buttons[1] = buttons[1].setDisabled(false);
		buttons[2] = buttons[2].setDisabled(false);
	}
	return [
		{
			components: buttons,
			type: 1,
		},
	];
}

// biome-ignore lint/suspicious/noExplicitAny: prevent issues
function labelButton(id: CommandName, translation: any, guildID: string) {
	const idIndex = Object.values(CommandName).indexOf(id);
	const value = Object.values(CommandName)[idIndex];
	const translated = translation[value];
	if (id === CommandName.manualMode) {
		const truc = [
			CommandName.channel,
			CommandName.member,
			CommandName.thread,
			CommandName.newMember,
		].map((command) => getConfig(command, guildID));
		const manualMode = truc.some((value) => value);
		return manualMode
			? `${i18next.t("common.enable")} : ${translated}`
			: `${i18next.t("common.disable")} : ${translated}`;
	}
	return getConfig(id, guildID)
		? `${i18next.t("common.disable")} : ${translated}`
		: `${i18next.t("common.enable")} : ${translated}`;
}

function reloadButtonAuto(guildID: string) {
	const translation = {
		[CommandName.manualMode]: i18next.t("configuration.disable.name"),
		[CommandName.channel]: i18next.t("configuration.channel.name"),
		[CommandName.member]: i18next.t("configuration.member.name"),
		[CommandName.newMember]: i18next.t("configuration.newMember.name"),
		[CommandName.thread]: i18next.t("configuration.thread.name"),
	};
	const buttons: ButtonBuilder[] = [];
	for (const command of [
		CommandName.manualMode,
		CommandName.channel,
		CommandName.member,
		CommandName.newMember,
		CommandName.thread,
	].values()) {
		buttons.push(
			createButton(command, labelButton(command, translation, guildID), guildID)
		);
	}
	return [
		{
			components: [buttons[0]],
			type: 1,
		},
		{
			components: buttons.slice(1, buttons.length),
			type: 1,
		},
	];
}
