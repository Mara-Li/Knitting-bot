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
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteractionOptionResolver,
	channelMention,
	EmbedBuilder,
	Locale,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type StringSelectMenuInteraction,
} from "discord.js";
import { getTranslation, getUl, ln, t } from "../i18n";
import { CommandName, type Translation } from "../interface";
import { getConfig, optionMaps, setConfig } from "../maps";
import { logInDev } from "../utils";
import "../discord_ext";

export default {
	data: new SlashCommandBuilder()
		.setNames("configuration.main.name")
		.setDescriptions("configuration.main.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("configuration.menu.log.channel.title")
				.setDescriptions("configuration.menu.log.desc")
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("configuration.menu.log.channel.desc")
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
				.setNames("configuration.menu.mode.title")
				.setDescriptions("configuration.menu.mode.desc")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("locale")
				.setNameLocalizations({
					fr: "langue",
				})
				.setDescriptions("configuration.language.desc")
				.addStringOption((option) =>
					option
						.setName("locale")
						.setNameLocalizations({
							fr: "langue",
						})
						.setDescriptions("configuration.language.options")
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
				.setNames("configuration.menu.autoUpdate.cmd")
				.setDescriptions("configuration.menu.autoUpdate.desc")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const ul = getUl(interaction);
		const commands = options.getSubcommand();
		if (t("configuration.menu.log.channel.title").toLowerCase() === commands) {
			const channel = options.getChannel(t("common.channel").toLowerCase());
			if (channel) {
				setConfig(`${CommandName.log}.channel`, interaction.guild.id, channel.id);
				await interaction.reply({
					content: ul("configuration.menu.log.channel.success", {
						channel: channelMention(channel.id),
					}) as string,
				});
			} else {
				setConfig(`${CommandName.log}.channel`, interaction.guild.id, false);
				await interaction.reply({
					content: ul("configuration.menu.log.channel.disable"),
				});
			}
		} else if (t("configuration.menu.mode.title").toLowerCase() === commands) {
			// eslint-disable-next-line no-case-declarations
			const row = reloadButtonMode(interaction.guild.id, ul);
			// eslint-disable-next-line no-case-declarations
			const embed = displayModeMenu(interaction.guild.id, ul);
			await interaction.reply({
				components: row,
				embeds: [embed],
			});
		} else if (t("configuration.menu.autoUpdate.cmd").toLowerCase() === commands) {
			const rows = reloadButtonAuto(interaction.guild.id, ul);
			const embeds = autoUpdateMenu(interaction.guild.id, ul);
			await interaction.reply({
				components: rows,
				embeds: [embeds],
			});
		} else if (commands === "locale") {
			const locale = options.getString("locale", true);
			let lang = optionMaps.get(interaction.guild.id, "language");
			if (locale === "en") {
				optionMaps.set(interaction.guild.id, Locale.EnglishUS, "language");
				lang = Locale.EnglishUS;
			} else if (locale === "fr") {
				optionMaps.set(interaction.guild.id, Locale.French, "language");
				lang = Locale.French;
			}
			const ul = ln(lang ?? interaction.locale);
			await interaction.reply({
				content: `${ul("configuration.language.validate", { lang: (locale as Locale).toUpperCase() })}`,
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
					await updateConfig(i.customId as CommandName, i as ButtonInteraction, ul);
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
function displayModeMenu(guildID: string, ul: Translation): EmbedBuilder {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(ul("configuration.menu.mode.title"))
		.addFields(
			{
				inline: true,
				name: ul("configuration.follow.role.title"),
				value: enabledOrDisabled(
					getConfig(CommandName.followOnlyRole, guildID) as boolean,
					ul
				),
			},
			{
				inline: true,
				name: ul("configuration.follow.thread.title"),
				value: enabledOrDisabled(
					getConfig(CommandName.followOnlyChannel, guildID) as boolean,
					ul
				),
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				inline: true,
				name: ul("configuration.follow.roleIn"),
				value: enabledOrDisabled(
					getConfig(CommandName.followOnlyRoleIn, guildID) as boolean,
					ul
				),
			},
			{ inline: true, name: "\u200A", value: "\u200A" }
		);
}

function autoUpdateMenu(guildID: string, ul: Translation): EmbedBuilder {
	return new EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(ul("configuration.menu.autoUpdate.title"))
		.addFields(
			{
				inline: true,
				name: ul("configuration.channel.title"),
				value: enabledOrDisabled(getConfig(CommandName.channel, guildID) as boolean, ul),
			},
			{
				inline: true,
				name: ul("configuration.member.title"),
				value: enabledOrDisabled(getConfig(CommandName.member, guildID) as boolean, ul),
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				inline: true,
				name: ul("configuration.newMember.display"),
				value: enabledOrDisabled(
					getConfig(CommandName.newMember, guildID) as boolean,
					ul
				),
			},
			{
				inline: true,
				name: ul("configuration.thread.display"),
				value: enabledOrDisabled(getConfig(CommandName.thread, guildID) as boolean, ul),
			}
		);
}

/**
 * Return the translation if value is true or false
 * @param {boolean} value The value to check
 * @param ul
 */
function enabledOrDisabled(value: boolean, ul: Translation): string {
	return value ? ul("common.enabled") : ul("common.disabled");
}

/**
 * Update the configuration and edit the interaction message with the new configuration
 * @param command {@link CommandName}
 * @param interaction
 * @param ul
 */
async function updateConfig(
	command: CommandName,
	interaction: ButtonInteraction | StringSelectMenuInteraction,
	ul: Translation
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
		const embed = displayModeMenu(interaction.guild.id, ul);
		const rows = reloadButtonMode(interaction.guild.id, ul);
		await interaction.editReply({ components: rows, embeds: [embed] });
	} else if (command === CommandName.manualMode) {
		const names = [
			CommandName.channel,
			CommandName.member,
			CommandName.thread,
			CommandName.newMember,
		];

		const allnames = names.map((command) => {
			if (!interaction.guild) return false;
			return getConfig(command, interaction.guild.id);
		});
		const manualMode = allnames.every((value) => value);
		for (const command of names) {
			setConfig(command, interaction.guild.id, !manualMode);
		}
		const embed = autoUpdateMenu(interaction.guild.id, ul);
		//reload buttons
		const rows = reloadButtonAuto(interaction.guild.id, ul);
		await interaction.editReply({ components: rows, embeds: [embed] });
	} else {
		newConfig = !getConfig(command, interaction.guild.id);
		await interaction.editReply({ content: "" });
		setConfig(command, interaction.guild.id, newConfig);
		let embed: EmbedBuilder;
		//reload buttons
		let rows: { type: number; components: ButtonBuilder[] }[];
		if (commandType.Mode.includes(command)) {
			rows = reloadButtonMode(interaction.guild.id, ul);
			embed = displayModeMenu(interaction.guild.id, ul);
		} else {
			rows = reloadButtonAuto(interaction.guild.id, ul);
			embed = autoUpdateMenu(interaction.guild.id, ul);
		}
		await interaction.editReply({ components: rows, embeds: [embed] });
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

function reloadButtonMode(guildID: string, ul: Translation) {
	const translation = {
		[CommandName.followOnlyRoleIn]: ul("configuration.roleIn.name"),
		[CommandName.followOnlyRole]: ul("configuration.follow.role.name"),
		[CommandName.followOnlyChannel]: ul("configuration.follow.thread.name"),
	};

	const buttons: ButtonBuilder[] = [];
	for (const command of [
		CommandName.followOnlyRoleIn,
		CommandName.followOnlyRole,
		CommandName.followOnlyChannel,
	].values()) {
		buttons.push(
			createButton(command, labelButton(command, translation, guildID, ul), guildID)
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

function labelButton(
	id: CommandName,
	// biome-ignore lint/suspicious/noExplicitAny: easier
	translation: any,
	guildID: string,
	ul: Translation
) {
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
			? `${ul("common.enable")} : ${translated}`
			: `${ul("common.disable")} : ${translated}`;
	}
	return getConfig(id, guildID)
		? `${ul("common.disable")} : ${translated}`
		: `${ul("common.enable")} : ${translated}`;
}

function reloadButtonAuto(guildID: string, ul: Translation) {
	const translation = {
		[CommandName.manualMode]: ul("configuration.disable.name"),
		[CommandName.channel]: ul("configuration.channel.name"),
		[CommandName.member]: ul("configuration.member.name"),
		[CommandName.newMember]: ul("configuration.newMember.name"),
		[CommandName.thread]: ul("configuration.thread.name"),
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
			createButton(command, labelButton(command, translation, guildID, ul), guildID)
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
