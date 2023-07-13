/**
 * Configuration menu rework using button
 * Clicking on a button will edit the configuration data:
 * - Language {en, fr}
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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	CommandInteraction,
	CommandInteractionOptionResolver,
	EmbedBuilder,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
	ChannelType,
	channelMention
} from "discord.js";
import { default as i18next, languageValue } from "../i18n/i18next";
import { CommandName } from "../interface";
import { getConfig, setConfig } from "../maps";
import { logInDev } from "../utils";
import {dedent} from "ts-dedent";

const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");


export default {
	data: new SlashCommandBuilder()
		.setName(en("configuration.main.name"))
		.setNameLocalizations({
			"fr": fr("configuration.main.name")
		})
		.setDescription(en("configuration.main.description"))
		.setDescriptionLocalizations({
			"fr": fr("configuration.main.description")
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommandGroup(subcommandGroup =>
			subcommandGroup
				.setName(en("configuration.menu.general.name").toLowerCase())
				.setNameLocalizations({
					"fr": fr("configuration.menu.general.name").toLowerCase()
				})
				.setDescription(en("configuration.menu.general.desc"))
				.addSubcommand(subcommand =>
					subcommand
						.setName(en("configuration.menu.general.display.title").toLowerCase())
						.setNameLocalizations({
							"fr": fr("configuration.menu.general.display.title").toLowerCase()
						})
						.setDescription(en("configuration.menu.general.display.desc"))
						.setDescriptionLocalizations({
							"fr": fr("configuration.menu.general.display.desc")
						})
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName(en("configuration.menu.log.channel.title").toLowerCase())
						.setNameLocalizations({
							"fr": fr("configuration.menu.log.channel.title").toLowerCase()
						})
						.setDescription(en("configuration.menu.log.desc"))
						.setDescriptionLocalizations({
							"fr": fr("configuration.menu.log.desc")
						})
						.addChannelOption(option =>
							option
								.setName(en("common.channel").toLowerCase())
								.setNameLocalizations({
									"fr": fr("common.channel").toLowerCase()
								})
								.setDescription(en("configuration.menu.log.channel.desc"))
								.setDescriptionLocalizations({
									"fr": fr("configuration.menu.log.channel.desc")
								})
								.setRequired(true)
								.addChannelTypes(ChannelType.GuildText, ChannelType.AnnouncementThread, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildAnnouncement)
						)
				)
		)
			
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("commands.help.name").toLowerCase())
				.setNameLocalizations({
					"fr": fr("commands.help.name").toLowerCase()
				})
				.setDescription(en("configuration.menu.help.desc"))
				.setDescriptionLocalizations({
					"fr": fr("configuration.menu.help.desc")
				})
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("configuration.menu.mode.title").toLowerCase())
				.setNameLocalizations({
					"fr": fr("configuration.menu.mode.title").toLowerCase()
				})
				.setDescription(en("configuration.menu.mode.desc"))
				.setDescriptionLocalizations({
					"fr": fr("configuration.menu.mode.desc")
				})
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("configuration.menu.autoUpdate.cmd").toLowerCase())
				.setNameLocalizations({
					"fr": fr("configuration.menu.autoUpdate.cmd").toLowerCase()
				})
				.setDescription(en("configuration.menu.autoUpdate.desc"))
				.setDescriptionLocalizations({
					"fr": fr("configuration.menu.autoUpdate.desc")
				})
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const group = options.getSubcommandGroup();
		logInDev("configuration", commands, group);
		if (en("configuration.menu.log.channel.title").toLowerCase() === commands) {
			const channel = options.getChannel(en("common.channel").toLowerCase(), true);
			if (!channel) return;
			setConfig(`${CommandName.log}.channel`, interaction.guild.id, channel.id);
			interaction.reply({
				content: (i18next.t("configuration.menu.log.channel.success", { channel: channelMention(channel.id) }) as string),
				ephemeral: true
			});
		} else if (en("configuration.menu.mode.title").toLowerCase() === commands) {
			// eslint-disable-next-line no-case-declarations
			const row = reloadButtonMode(interaction.guild.id);
			// eslint-disable-next-line no-case-declarations
			const embed = displayModeMenu(interaction.guild.id);
			interaction.reply(
				{
					embeds: [embed],
					components: row
				});
		} else if (en("configuration.menu.autoUpdate.cmd").toLowerCase() === commands) {
			// eslint-disable-next-line no-case-declarations
			const rows = reloadButtonAuto(interaction.guild.id);
			// eslint-disable-next-line no-case-declarations
			const embeds = autoUpdateMenu(interaction.guild.id);
			interaction.reply(
				{
					embeds: [embeds],
					components: rows
				});
		} else if ( group === "general" && en("configuration.menu.general.display.title").toLowerCase() === commands) {
			const rows = reloadButtonLanguage(interaction.guild.id);
			const embeds = displayLanguageMenu(interaction.guild.id);
			interaction.reply(
				{
					embeds: [embeds],
					components: rows
				});
		} else {
			const embeds = display();
			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setEmoji("📖")
						.setURL(`${i18next.t("info.readMe")}`)
						.setLabel(i18next.t("configuration.menu.help.readme"))
						.setStyle(ButtonStyle.Link)
				);
			await interaction.reply(
				{
					embeds: [embeds],
					components: [row],
					fetchReply: true
				},);
		}
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		const filter = (i: any) => {
			/** filter on message id */
			return i.user.id === interaction.user.id;
		};
		try {
			const message = await interaction.fetchReply();
			message.createMessageComponentCollector({ filter, time: 60000})
				?.on("collect", async i => {
					await i.deferUpdate();
					await updateConfig(i.customId as CommandName, i as ButtonInteraction<CacheType>);
				})
				?.on("end", async () => {
					interaction.editReply({ components: [] });
				});
		} catch (error) {
			logInDev(error);
			interaction.editReply({ components: [] });
		}
	}
};

/**
 * Display Mode menu as an embed
 * @returns {@link EmbedBuilder}
 */
function displayModeMenu(guildID: string) : EmbedBuilder {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.mode.title"))
		.addFields(
			{
				name: i18next.t("configuration.follow.role.title"),
				value: enabledOrDisabled(getConfig(CommandName.followOnlyRole, guildID) as boolean),
				inline: true,
			},
			{
				name: i18next.t("configuration.follow.thread.title"),
				value: enabledOrDisabled(getConfig(CommandName.followOnlyChannel, guildID) as boolean),
				inline: true,
			},
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.follow.roleIn"),
				value: enabledOrDisabled(getConfig(CommandName.followOnlyRoleIn, guildID) as boolean),
				inline: true,
			},
			{ name: "\u200A", value: "\u200A", inline: true });
}

function autoUpdateMenu(guildID: string): EmbedBuilder {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.autoUpdate.title"))
		.addFields(
			{
				name: i18next.t("configuration.channel.title"),
				value: enabledOrDisabled(getConfig(CommandName.channel, guildID) as boolean),
				inline: true,
			},
			{
				name: i18next.t("configuration.member.title"),
				value: enabledOrDisabled(getConfig(CommandName.member, guildID) as boolean),
				inline: true,
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.newMember.display"),
				value: enabledOrDisabled(getConfig(CommandName.newMember, guildID) as boolean),
				inline: true,
			},
			{
				name: i18next.t("configuration.thread.display"),
				value: enabledOrDisabled(getConfig(CommandName.thread, guildID) as boolean),
				inline: true,
			}
		);
}

function displayLanguageMenu(guildID: string) {
	const activatedLog = getConfig(CommandName.log, guildID) as boolean;
	let msg = i18next.t("configuration.log.display", { channel: i18next.t("common.disabled")});
	let logChannel :null | boolean | string = i18next.t("common.none");
	if (activatedLog) {
		logChannel = getConfig(CommandName.log, guildID, true);
		logInDev(logChannel);
		if (logChannel !== undefined) {
			logChannel = channelMention(logChannel as string);
		} else {
			logChannel = i18next.t("common.none");
		}
		msg = i18next.t("configuration.log.display", { channel: logChannel });
	}
	const desc = dedent(`
	- ${languageValue[getConfig(CommandName.language, guildID) as string]}
	- ${msg}`);
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.general"))
		.setDescription(desc);
}

/**
 * Display the configuration as an embed
 */
function display() {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.show.menu.title"))
		.setDescription(i18next.t("configuration.show.menu.description"))
		.addFields(
			{
				name: i18next.t("configuration.language.name"),
				value: `\`/config ${i18next.t("configuration.language.name").toLowerCase()}\``,
			})
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.menu.mode.title"),
				value: `\`/config ${i18next.t("configuration.menu.mode.title").toLowerCase()}\``,
			})
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.menu.autoUpdate.title"),
				value: `\`/config ${i18next.t("configuration.menu.autoUpdate.cmd").toLowerCase()}\``,
			});
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
async function updateConfig(command: CommandName, interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction) {
	if (!interaction.guild) return;
	let newConfig: string | boolean;
	const commandType= {
		"Language" : CommandName.language,
		"Mode" : [CommandName.followOnlyRole, CommandName.followOnlyChannel, CommandName.followOnlyRoleIn],
		"AutoUpdate" : [CommandName.channel, CommandName.member, CommandName.newMember, CommandName.thread, CommandName.manualMode]
	};
	const followOnlyRole = getConfig(CommandName.followOnlyRole, interaction.guild.id);
	const followOnlyChannel = getConfig(CommandName.followOnlyChannel, interaction.guild.id);
	const followOnlyRoleIn = getConfig(CommandName.followOnlyRoleIn, interaction.guild.id);
	if (command === CommandName.language) {
		const interactSelect = interaction as StringSelectMenuInteraction;
		newConfig = interactSelect.values[0] as string;
		// reload i18next
		await i18next.changeLanguage(newConfig as string);
		setConfig(command, interaction.guild.id, newConfig);
		const embed = displayLanguageMenu(interaction.guild.id);
		//reload buttons
		const rows = reloadButtonLanguage(interaction.guild.id);
		interaction.editReply({ embeds: [embed], components: rows });
	} else if (
		command === CommandName.followOnlyRoleIn
			&& (followOnlyChannel || followOnlyRole)
		|| (followOnlyRoleIn
			&& (command === CommandName.followOnlyChannel
				|| command === CommandName.followOnlyRole))
	) {
		const embed = displayModeMenu(interaction.guild.id);
		const rows = reloadButtonMode(interaction.guild.id);
		interaction.editReply({ embeds: [embed], components: rows });
	} else if (command === CommandName.manualMode) {
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember];
		
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
		interaction.editReply({ embeds: [embed], components: rows });
	} else {
		newConfig = !getConfig(command, interaction.guild.id);
		interaction.editReply({ content: ""});
		setConfig(command, interaction.guild.id, newConfig);
		let embed: EmbedBuilder;
		//reload buttons
		let rows;
		if (commandType["Mode"].includes(command)) {
			rows = reloadButtonMode(interaction.guild.id);
			embed = displayModeMenu(interaction.guild.id);
		} else if (commandType["AutoUpdate"].includes(command)) {
			rows = reloadButtonAuto(interaction.guild.id);
			embed = autoUpdateMenu(interaction.guild.id);
		} else {
			rows = reloadButtonLanguage(interaction.guild.id);
			embed = displayLanguageMenu(interaction.guild.id);
		}
		interaction.editReply({ embeds: [embed], components: rows });
	}
	
}

function createLanguageButton() {
	const selectMenu = [];
	for (const [id, lang] of Object.entries(languageValue)) {
		selectMenu.push(
			new StringSelectMenuOptionBuilder()
				.setLabel(lang as string)
				.setValue(id)
		);
	}
	
	return new StringSelectMenuBuilder()
		.setCustomId(CommandName.language)
		.setPlaceholder(i18next.t("configuration.language.name"))
		.addOptions(selectMenu);
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
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember];
		const allTruc = truc.map((command) => getConfig(command, guildID));
		style = allTruc.some((value) => value) ? ButtonStyle.Danger : ButtonStyle.Success;
	}
	return new ButtonBuilder()
		.setCustomId(command)
		.setStyle(style)
		.setLabel(label);
}

function reloadButtonLanguage(guildID: string) {
	return [{
		type: 1,
		components: [createLanguageButton()]
	},
	{
		type: 1,
		components: [createButton(CommandName.log, i18next.t("configuration.log.name"), guildID)]
	}];
}

function reloadButtonMode(guildID: string) {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	const translation: any = {
		[CommandName.followOnlyRoleIn]: i18next.t("configuration.roleIn.name"),
		[CommandName.followOnlyRole]: i18next.t("configuration.follow.role.name"),
		[CommandName.followOnlyChannel]: i18next.t("configuration.follow.thread.name"),
	};
	
	const buttons: ButtonBuilder[] = [];
	for (const command of [CommandName.followOnlyRoleIn, CommandName.followOnlyRole, CommandName.followOnlyChannel].values()) {
		buttons.push(createButton(command, labelButton(command, translation, guildID), guildID));
	}
	if (getConfig(CommandName.followOnlyRoleIn, guildID)) {
		/**
		 * Disable the button if followRoleIn is enable
		 */
		buttons[1] = buttons[1].setDisabled(true);
		buttons[2] = buttons[2].setDisabled(true);
	} else if (getConfig(CommandName.followOnlyRole, guildID) || getConfig(CommandName.followOnlyChannel, guildID)) {
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
			type: 1,
			components: buttons
		}
	];
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
function labelButton(id: CommandName, translation: any, guildID: string) {
	const idIndex = Object.values(CommandName).indexOf(id);
	const value = Object.values(CommandName)[idIndex];
	const translated = translation[value];
	if (id === CommandName.manualMode) {
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember].map((command) => getConfig(command, guildID));
		const manualMode = truc.some((value) => value);
		return manualMode ? `${i18next.t("common.enable")} : ${translated}` : `${i18next.t("common.disable")} : ${translated}`;
	}
	return getConfig(id, guildID) ? `${i18next.t("common.disable")} : ${translated}` : `${i18next.t("common.enable")} : ${translated}`;
}

function reloadButtonAuto(guildID: string) {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	const translation:any = {
		[CommandName.manualMode]: i18next.t("configuration.disable.name"),
		[CommandName.channel]: i18next.t("configuration.channel.name"),
		[CommandName.member]: i18next.t("configuration.member.name"),
		[CommandName.newMember]: i18next.t("configuration.newMember.name"),
		[CommandName.thread]: i18next.t("configuration.thread.name"),
	};
	const buttons:ButtonBuilder[] = [];
	for (const command of [CommandName.manualMode, CommandName.channel, CommandName.member, CommandName.newMember, CommandName.thread].values()) {
		buttons.push(createButton(command, labelButton(command, translation, guildID), guildID));
	}
	return [{
		type: 1,
		components: [buttons[0]]
	},
	{
		type: 1,
		components: buttons.slice(1, buttons.length)
	}];
}


