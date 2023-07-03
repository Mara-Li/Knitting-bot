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
import { SlashCommandBuilder } from "@discordjs/builders";
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
} from "discord.js";
import { default as i18next, languageValue } from "../i18n/i18next";
import { CommandName } from "../interface";
import { getConfig, setConfig } from "../maps";
import { logInDev } from "../utils";

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
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("configuration.menu.language.title").toLowerCase())
				.setNameLocalizations({
					"fr": fr("configuration.menu.language.title").toLowerCase()
				})
				.setDescription(en("configuration.menu.language.desc"))
				.setDescriptionLocalizations({
					"fr": fr("configuration.menu.language.desc")
				})
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
		if (en("configuration.menu.mode.title").toLowerCase() === commands) {
			// eslint-disable-next-line no-case-declarations
			const row = reloadButtonMode();
			// eslint-disable-next-line no-case-declarations
			const embed = displayModeMenu();
			await interaction.reply(
				{
					embeds: [embed],
					components: row
				});
		} else if (en("configuration.menu.autoUpdate.title").toLowerCase() === commands) {
			// eslint-disable-next-line no-case-declarations
			const rows = reloadButtonAuto();
			// eslint-disable-next-line no-case-declarations
			const embeds = autoUpdateMenu();
			await interaction.reply(
				{
					embeds: [embeds],
					components: rows
				});
		} else if (en("configuration.language.name").toLowerCase() === commands) {
			const rows = reloadButtonLanguage();
			const embeds = displayLanguageMenu();
			await interaction.reply(
				{
					embeds: [embeds],
					components: rows
				});
		} else {
			const embeds = await display();
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
					components: [row]
				});
		}
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		const filter = (i: any) => i.user.id === interaction.user.id;
		try {
			interaction.channel?.createMessageComponentCollector({ filter})?.on("collect", async i => {
				await i.deferUpdate();
				await updateConfig(i.customId as CommandName, i as ButtonInteraction<CacheType>);
			});
			/** Remove buttons after 1 minute */
			setTimeout(async () => {
				await interaction.editReply({ components: [] });
			}, 60000);
		} catch (error) {
			logInDev(error);
			await interaction.editReply({ components: [] });
		}
	}
};

/**
 * Display Mode menu as an embed
 * @returns {@link EmbedBuilder}
 */
function displayModeMenu() {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.mode.title"))
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
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				name: i18next.t("configuration.follow.roleIn"),
				value: enabledOrDisabled(getConfig(CommandName.followOnlyRoleIn)),
				inline: true,
			},
			{ name: "\u200A", value: "\u200A", inline: true });
}

function autoUpdateMenu() {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.autoUpdate.title"))
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
}

function displayLanguageMenu() {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(i18next.t("configuration.menu.language.desc"))
		.setDescription(languageValue[getConfig(CommandName.language) as string]);
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
	let newConfig: string | boolean;
	const commandType= {
		"Language" : CommandName.language,
		"Mode" : [CommandName.followOnlyRole, CommandName.followOnlyChannel, CommandName.followOnlyRoleIn],
		"AutoUpdate" : [CommandName.channel, CommandName.member, CommandName.newMember, CommandName.thread, CommandName.manualMode]
	};
	const followOnlyRole = getConfig(CommandName.followOnlyRole);
	const followOnlyChannel = getConfig(CommandName.followOnlyChannel);
	const followOnlyRoleIn = getConfig(CommandName.followOnlyRoleIn);
	if (command === CommandName.language) {
		const interactSelect = interaction as StringSelectMenuInteraction;
		newConfig = interactSelect.values[0];
		// reload i18next
		await i18next.changeLanguage(newConfig as string);
		setConfig(command, newConfig);
		const embed = displayLanguageMenu();
		//reload buttons
		const rows = reloadButtonLanguage();
		await interaction.editReply({ embeds: [embed], components: rows });
	} else if (
		command === CommandName.followOnlyRoleIn
			&& (followOnlyChannel || followOnlyRole)
		|| (followOnlyRoleIn
			&& (command === CommandName.followOnlyChannel
				|| command === CommandName.followOnlyRole))
	) {
		const embed = displayModeMenu();
		//reload buttons
		const rows = reloadButtonMode();
		await interaction.editReply({ embeds: [embed], components: rows });
		interaction.editReply({ content: `**${i18next.t("configuration.roleIn.error")}**` });
	} else if (command === CommandName.manualMode) {
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember];
		const allTruc = truc.map((command) => getConfig(command));
		const manualMode = allTruc.every((value) => value);
		for (const command of truc) {
			setConfig(command, !manualMode);
		}
		const embed = await autoUpdateMenu();
		//reload buttons
		const rows = reloadButtonAuto();
		await interaction.editReply({ embeds: [embed], components: rows });
	} else {
		newConfig = !getConfig(command);
		interaction.editReply({ content: ""});
		setConfig(command, newConfig);
		let embed = display();
		//reload buttons
		let rows = [];
		if (commandType["Mode"].includes(command)) {
			rows = reloadButtonMode();
			embed = displayModeMenu();
		} else if (commandType["AutoUpdate"].includes(command)) {
			rows = reloadButtonAuto();
			embed = await autoUpdateMenu();
		} else {
			rows = reloadButtonLanguage();
			embed = displayLanguageMenu();
		}
		await interaction.editReply({ embeds: [embed], components: rows });
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
 */

function createButton(command: CommandName, label: string) {
	let style = getConfig(command) ? ButtonStyle.Danger : ButtonStyle.Success;
	if (command === CommandName.manualMode) {
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember];
		const allTruc = truc.map((command) => getConfig(command));
		style = allTruc.some((value) => value) ? ButtonStyle.Danger : ButtonStyle.Success;
	}
	return new ButtonBuilder()
		.setCustomId(command)
		.setStyle(style)
		.setLabel(label);
}

function reloadButtonLanguage() {
	return [{
		type: 1,
		components: [createLanguageButton()]
	}];
}

function reloadButtonMode() {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	const translation: any = {
		[CommandName.followOnlyRoleIn]: i18next.t("configuration.roleIn.name"),
		[CommandName.followOnlyRole]: i18next.t("configuration.follow.role.name"),
		[CommandName.followOnlyChannel]: i18next.t("configuration.follow.thread.name"),
	};
	
	const buttons: ButtonBuilder[] = [];
	for (const command of [CommandName.followOnlyRoleIn, CommandName.followOnlyRole, CommandName.followOnlyChannel].values()) {
		buttons.push(createButton(command, labelButton(command, translation)));
	}
	return [
		{
			type: 1,
			components: buttons
		}
	];
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
function labelButton(id: CommandName, translation: any) {
	const idIndex = Object.values(CommandName).indexOf(id);
	const value = Object.values(CommandName)[idIndex];
	const translated = translation[value];
	if (id === CommandName.manualMode) {
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember].map((command) => getConfig(command));
		const manualMode = truc.some((value) => value);
		return manualMode ? `${i18next.t("common.enable")} : ${translated}` : `${i18next.t("common.disable")} : ${translated}`;
	}
	return getConfig(id) ? `${i18next.t("common.disable")} : ${translated}` : `${i18next.t("common.enable")} : ${translated}`;
}

function reloadButtonAuto() {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	const translation:any = {
		[CommandName.manualMode]: i18next.t("configuration.disable.name"),
		[CommandName.channel]: i18next.t("configuration.channel.name"),
		[CommandName.member]: i18next.t("configuration.member.name"),
		[CommandName.newMember]: i18next.t("configuration.newMember.name"),
		[CommandName.thread]: i18next.t("configuration.thread.name"),
	};
	const buttons = [];
	for (const command of [CommandName.manualMode, CommandName.channel, CommandName.member, CommandName.newMember, CommandName.thread].values()) {
		buttons.push(createButton(command, labelButton(command, translation)));
	}
	return [{
		type: 1,
		components: buttons
	}];
}

