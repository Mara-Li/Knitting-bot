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
import * as Djs from "discord.js";
import { getUl, ln, t } from "../i18n";
import type { ConfigurationKey, Translation } from "../interface";
import { getConfig, getDefaultServerData, serverDataDb, setConfig } from "../maps";

import "../discord_ext.js";
import dedent from "dedent";

export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("configuration.main.name")
		.setDescriptions("configuration.main.description")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("configuration.menu.log.channel.title")
				.setDescriptions("configuration.menu.log.desc")
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("configuration.menu.log.channel.desc")
						.addChannelTypes(
							Djs.ChannelType.GuildText,
							Djs.ChannelType.AnnouncementThread,
							Djs.ChannelType.PublicThread,
							Djs.ChannelType.PrivateThread,
							Djs.ChannelType.GuildAnnouncement
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
		)
		.addSubcommand((sub) =>
			sub
				.setNames("configuration.pin.name")
				.setDescriptions("configuration.pin.description")
				.addBooleanOption((toggle) =>
					toggle
						.setNames("configuration.pin.option.name")
						.setDescriptions("configuration.pin.option.description")
				)
		)
		.addSubcommand((sub) =>
			sub
				.setNames("configuration.message.name")
				.setDescriptions("configuration.message.description")
				.addStringOption((input) =>
					input
						.setNames("configuration.message.option.name")
						.setDescriptions("configuration.message.option.description")
				)
		)
		.addSubcommand((sub) =>
			sub
				.setNames("configuration.display.title")
				.setDescriptions("configuration.display.description")
		),
	async execute(interaction: Djs.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const ul = getUl(interaction);
		const commands = options.getSubcommand();
		if (commands === t("configuration.display.title")) {
			await displayConfig(interaction);
			return;
		}
		if (t("configuration.menu.log.channel.title") === commands) {
			await handleLogChannelConfig(interaction, options, ul);
			return;
		}

		if (commands === t("configuration.pin.name")) {
			await handlePinConfig(interaction, options, ul);
			return;
		}

		if (t("configuration.menu.mode.title").toLowerCase() === commands) {
			await handleModeConfig(interaction, ul);
			return;
		}

		if (t("configuration.menu.autoUpdate.cmd") === commands) {
			await handleAutoUpdateConfig(interaction, ul);
			return;
		}

		if (commands === "locale") {
			await handleLocaleConfig(interaction, options);
			return;
		}

		if (commands === t("configuration.message.name")) {
			await handleMessageConfig(interaction, options, ul);
			return;
		}
	},
};

async function handleMessageConfig(
	interaction: Djs.ChatInputCommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation
) {
	if (!interaction.guild) return;

	const messageToSend = options.getString(
		t("configuration.message.option.name").toLowerCase()
	);

	if (!messageToSend) {
		setConfig("messageToSend", interaction.guild.id, "_ _");
		await interaction.reply({
			content: ul("configuration.message.response.default"),
		});
		return;
	}
	if (messageToSend?.trim().length === 0) {
		await interaction.reply({
			content: ul("configuration.message.response.error"),
		});
		return;
	}
	setConfig("messageToSend", interaction.guild.id, messageToSend);
	await interaction.reply({
		content: ul("configuration.message.response.custom", {
			message: messageToSend,
		}),
	});
}

/**
 * Handle log channel configuration
 */
async function handleLogChannelConfig(
	interaction: Djs.ChatInputCommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation
) {
	if (!interaction.guild) return;

	const channel = options.getChannel(t("common.channel").toLowerCase());
	if (channel) {
		if (
			channel.type !== Djs.ChannelType.GuildText &&
			channel.type !== Djs.ChannelType.GuildAnnouncement &&
			channel.type !== Djs.ChannelType.AnnouncementThread &&
			channel.type !== Djs.ChannelType.PublicThread &&
			channel.type !== Djs.ChannelType.PrivateThread
		) {
			await interaction.reply({
				content: ul("configuration.menu.log.channel.error"),
			});
			return;
		}
		setConfig("log", interaction.guild.id, channel.id);
		await interaction.reply({
			content: ul("configuration.menu.log.channel.success", {
				channel: Djs.channelMention(channel.id),
			}),
		});
	} else {
		setConfig("log", interaction.guild.id, false);
		await interaction.reply({
			content: ul("configuration.menu.log.channel.disable"),
		});
	}
}

/**
 * Handle pin configuration
 */
async function handlePinConfig(
	interaction: Djs.ChatInputCommandInteraction,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation
) {
	if (!interaction.guild) return;

	const toggle = options.getBoolean(t("configuration.pin.option.name"));
	setConfig("pin", interaction.guild.id, toggle ?? false);

	await interaction.reply({
		content: toggle
			? ul("configuration.pin.response.enabled")
			: ul("configuration.pin.response.disabled"),
	});
}

/**
 * Handle mode configuration
 */
async function handleModeConfig(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const row = reloadButtonMode(interaction.guild.id, ul);
	const embed = displayModeMenu(interaction.guild.id, ul);

	await interaction.reply({
		components: row,
		embeds: [embed],
	});

	await setupMessageCollector(interaction, ul);
}

/**
 * Handle auto-update configuration
 */
async function handleAutoUpdateConfig(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const rows = reloadButtonAuto(interaction.guild.id, ul);
	const embeds = autoUpdateMenu(interaction.guild.id, ul);

	await interaction.reply({
		components: rows,
		embeds: [embeds],
	});

	await setupMessageCollector(interaction, ul);
}

/**
 * Handle locale configuration
 */
async function handleLocaleConfig(
	interaction: Djs.ChatInputCommandInteraction,
	options: Djs.CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;

	const locale = options.getString("locale", true);
	let lang: Djs.Locale = interaction.locale;

	if (locale === "en") {
		setConfig("language", interaction.guild.id, Djs.Locale.EnglishUS);
		lang = Djs.Locale.EnglishUS;
	} else if (locale === "fr") {
		setConfig("language", interaction.guild.id, Djs.Locale.French);
		lang = Djs.Locale.French;
	}

	const ul = ln(lang);
	await interaction.reply({
		content: `${ul("configuration.language.validate", {
			lang: lang.toUpperCase(),
		})}`,
	});
}

/**
 * Setup message component collector for button interactions
 */
async function setupMessageCollector(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
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
				await updateConfig(i.customId, i as Djs.ButtonInteraction, ul);
			})
			?.on("end", async () => {
				await interaction.editReply({ components: [] });
			});
	} catch (error) {
		if (error instanceof Djs.DiscordAPIError && error.code === 10008) {
			// Message was deleted, no need to log error
			return;
		}
		console.warn(error);
		await interaction.editReply({ components: [] });
	}
}

/**
 * Display Mode menu as an embed
 */
function displayModeMenu(guildID: string, ul: Translation): Djs.EmbedBuilder {
	return new Djs.EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(ul("configuration.menu.mode.title"))
		.addFields(
			{
				inline: true,
				name: ul("configuration.follow.role.title"),
				value: enabledOrDisabled(getConfig("followOnlyRole", guildID) as boolean, ul),
			},
			{
				inline: true,
				name: ul("configuration.follow.thread.title"),
				value: enabledOrDisabled(getConfig("followOnlyChannel", guildID) as boolean, ul),
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				inline: true,
				name: ul("configuration.follow.roleIn"),
				value: enabledOrDisabled(getConfig("followOnlyRoleIn", guildID) as boolean, ul),
			},
			{ inline: true, name: "\u200A", value: "\u200A" }
		);
}

function autoUpdateMenu(guildID: string, ul: Translation): Djs.EmbedBuilder {
	return new Djs.EmbedBuilder()
		.setColor("#0099ff")
		.setTitle(ul("configuration.menu.autoUpdate.title"))
		.addFields(
			{
				inline: true,
				name: ul("configuration.channel.title"),
				value: enabledOrDisabled(getConfig("onChannelUpdate", guildID) as boolean, ul),
			},
			{
				inline: true,
				name: ul("configuration.member.title"),
				value: enabledOrDisabled(getConfig("onNewMember", guildID) as boolean, ul),
			}
		)
		.addFields({ name: "\u200A", value: "\u200A" })
		.addFields(
			{
				inline: true,
				name: ul("configuration.newMember.display"),
				value: enabledOrDisabled(getConfig("onNewMember", guildID) as boolean, ul),
			},
			{
				inline: true,
				name: ul("configuration.thread.display"),
				value: enabledOrDisabled(getConfig("onThreadCreated", guildID) as boolean, ul),
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
 */
async function updateConfig(
	command: ConfigurationKey,
	interaction: Djs.ButtonInteraction | Djs.StringSelectMenuInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;
	let newConfig: string | boolean;
	const commandType = {
		AutoUpdate: ["channel", "member", "newMember", "thread", "manualMode"],
		Mode: ["followOnlyRole", "followOnlyChannel", "followOnlyRoleIn"],
	};
	const followOnlyRole = getConfig("followOnlyRole", interaction.guild.id);
	const followOnlyChannel = getConfig("followOnlyChannel", interaction.guild.id);
	const followOnlyRoleIn = getConfig("followOnlyRoleIn", interaction.guild.id);
	if (
		(command === "followOnlyRoleIn" && (followOnlyChannel || followOnlyRole)) ||
		(followOnlyRoleIn &&
			(command === "followOnlyChannel" || command === "followOnlyRole"))
	) {
		const embed = displayModeMenu(interaction.guild.id, ul);
		const rows = reloadButtonMode(interaction.guild.id, ul);
		await interaction.editReply({ components: rows, embeds: [embed] });
	} else if (command === "manualMode") {
		const names = ["onChannelUpdate", "onMemberUpdate", "onThreadCreated", "onNewMember"];

		// Determine current manual mode flag
		const currentManual = getConfig("manualMode", interaction.guild.id) as boolean;

		if (!currentManual) {
			// Enabling manual mode: set manualMode = true and disable all auto-update flags
			setConfig("manualMode", interaction.guild.id, true);
			for (const cmd of names) {
				setConfig(cmd, interaction.guild.id, false);
			}
		} else {
			// Disabling manual mode: set manualMode = false and enable all auto-update flags
			setConfig("manualMode", interaction.guild.id, false);
			for (const cmd of names) {
				setConfig(cmd, interaction.guild.id, true);
			}
		}
		const embed = autoUpdateMenu(interaction.guild.id, ul);
		//reload buttons
		const rows = reloadButtonAuto(interaction.guild.id, ul);
		await interaction.editReply({ components: rows, embeds: [embed] });
	} else {
		newConfig = !getConfig(command, interaction.guild.id);
		await interaction.editReply({ content: "" });
		setConfig(command, interaction.guild.id, newConfig);
		let embed: Djs.EmbedBuilder;
		//reload buttons
		let rows: { type: number; components: Djs.ButtonBuilder[] }[];
		if (commandType.Mode.includes(command as string)) {
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
 */

function createButton(command: ConfigurationKey, label: string, guildID: string) {
	const manualModeEnabled = getConfig("manualMode", guildID);

	// If manual mode is enabled:
	// - the manual button is green (Success)
	// - all other buttons are grey (Secondary)
	if (manualModeEnabled) {
		if (command === "manualMode") {
			return new Djs.ButtonBuilder()
				.setCustomId(command)
				.setStyle(Djs.ButtonStyle.Success)
				.setLabel(label);
		}
		return new Djs.ButtonBuilder()
			.setCustomId(command as string)
			.setStyle(Djs.ButtonStyle.Secondary)
			.setLabel(label);
	}

	// If manual mode is disabled:
	// - the manual button is grey (Secondary)
	// - other buttons reflect their configuration state: green (Success) when enabled, red (Danger) when disabled
	if (command === "manualMode") {
		return new Djs.ButtonBuilder()
			.setCustomId(command)
			.setStyle(Djs.ButtonStyle.Secondary)
			.setLabel(label);
	}

	const style = getConfig(command, guildID)
		? Djs.ButtonStyle.Success
		: Djs.ButtonStyle.Danger;
	return new Djs.ButtonBuilder()
		.setCustomId(command as string)
		.setStyle(style)
		.setLabel(label);
}

function reloadButtonMode(guildID: string, ul: Translation) {
	const translation = {
		followOnlyChannel: ul("configuration.follow.thread.name"),
		followOnlyRole: ul("configuration.follow.role.name"),
		followOnlyRoleIn: ul("configuration.roleIn.name"),
	};

	const buttons: Djs.ButtonBuilder[] = [];
	for (const command of [
		"followOnlyRoleIn",
		"followOnlyRole",
		"followOnlyChannel",
	].values()) {
		buttons.push(
			createButton(command, labelButton(command, translation, guildID, ul), guildID)
		);
	}

	// If manual mode is enabled, grey and disable all mode buttons
	if (getConfig("manualMode", guildID)) {
		for (let i = 0; i < buttons.length; i++) {
			buttons[i] = buttons[i].setStyle(Djs.ButtonStyle.Secondary).setDisabled(true);
		}
		return [
			{
				components: buttons,
				type: 1,
			},
		];
	}

	if (getConfig("followOnlyRoleIn", guildID)) {
		/**
		 * Disable the button if followRoleIn is enable
		 */
		buttons[1] = buttons[1].setDisabled(true);
		buttons[2] = buttons[2].setDisabled(true);
	} else if (
		getConfig("followOnlyRole", guildID) ||
		getConfig("followOnlyChannel", guildID)
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
	id: ConfigurationKey,
	translation: Record<string, string>,
	guildID: string,
	ul: Translation
) {
	const translated = translation[id];
	if (id === "manualMode") {
		// Use the actual manualMode flag for the label instead of inferring from other flags
		const manualFlag = getConfig("manualMode", guildID) as boolean;
		return manualFlag
			? `${ul("common.disable")} : ${translated}`
			: `${ul("common.enable")} : ${translated}`;
	}
	return getConfig(id, guildID)
		? `${ul("common.disable")} : ${translated}`
		: `${ul("common.enable")} : ${translated}`;
}

function reloadButtonAuto(guildID: string, ul: Translation) {
	const translation = {
		channel: ul("configuration.channel.name"),
		manualMode: ul("configuration.disable.name"),
		member: ul("configuration.member.name"),
		newMember: ul("configuration.newMember.name"),
		thread: ul("configuration.thread.name"),
	};
	const buttons: Djs.ButtonBuilder[] = [];
	for (const command of [
		"manualMode",
		"channel",
		"member",
		"newMember",
		"thread",
	].values()) {
		buttons.push(
			createButton(command, labelButton(command, translation, guildID, ul), guildID)
		);
	}

	// If manual mode is enabled, force other buttons to Secondary and disabled
	if (getConfig("manualMode", guildID)) {
		buttons[0] = buttons[0].setStyle(Djs.ButtonStyle.Success);
		for (let i = 1; i < buttons.length; i++) {
			buttons[i] = buttons[i].setStyle(Djs.ButtonStyle.Secondary).setDisabled(true);
		}
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

async function displayConfig(interaction: Djs.ChatInputCommandInteraction) {
	if (!interaction.guild) return;
	const ul = getUl(interaction);
	const db = serverDataDb.get(interaction.guild.id) ?? getDefaultServerData();
	const config = db.configuration;
	const mode = {
		followOnlyChannel: getConfig("followOnlyChannel", interaction.guild.id),
		followOnlyRole: getConfig("followOnlyRole", interaction.guild.id),
		followOnlyRoleIn: getConfig("followOnlyRoleIn", interaction.guild.id),
	};
	const auto = {
		channel: getConfig("onChannelUpdate", interaction.guild.id),
		manualMode: getConfig("manualMode", interaction.guild.id),
		member: getConfig("onMemberUpdate", interaction.guild.id),
		newMember: getConfig("onNewMember", interaction.guild.id),
		thread: getConfig("onThreadCreated", interaction.guild.id),
	};

	const randomHexColor = Math.floor(Math.random() * 0xffffff);
	const s = ul("common.space");

	const autoStr =
		dedent(`- __${ul("configuration.channel.name")}__${s}: \`${auto.channel ? "✓" : "✕"}\`
					- __${ul("configuration.member.name")}__${s}: \`${auto.member ? "✓" : "✕"}\`
					- __${ul("configuration.newMember.display")}__${s}: \`${auto.newMember ? "✓" : "✕"}\`
					- __${ul("configuration.thread.display")}__${s}: \`${auto.thread ? "✓" : "✕"}\``);

	const manualStr = `- __${ul("configuration.disable.name")}__${s}: \`${auto.manualMode ? "✓" : "✕"}\``;

	const autoFinal = auto.manualMode ? manualStr : autoStr;

	const log =
		config.log && typeof config.log === "string" ? Djs.channelMention(config.log) : "`✕`";
	//use component v2
	const components = [
		new Djs.ContainerBuilder()
			.setAccentColor(randomHexColor)
			.addSectionComponents(
				new Djs.SectionBuilder()
					.setThumbnailAccessory(
						new Djs.ThumbnailBuilder().setURL(
							interaction.guild.iconURL() ||
								interaction.client.user.avatarURL() ||
								"https://raw.githubusercontent.com/Mara-Li/Knitting-bot/refs/heads/master/docs/_media/logo.png"
						)
					)
					.addTextDisplayComponents(
						new Djs.TextDisplayBuilder().setContent(
							dedent(`# ${ul("configuration.display.main.title")}
                        - __${ul("configuration.pin.name").toTitle()}__${s}: \`${config.pin ? "✓" : "✕"}\`
                        - __${ul("configuration.message.name").toTitle()}__${s}: \`${config.messageToSend}\`
                        - __${ul("configuration.language.name").toTitle()}__${s}: \`${config.language.toUpperCase()}\`
                        - __${ul("configuration.menu.log.channel.title").toTitle()}__${s}: ${log}
                        `)
						)
					)
			)
			.addSeparatorComponents(
				new Djs.SeparatorBuilder()
					.setSpacing(Djs.SeparatorSpacingSize.Small)
					.setDivider(true)
			)
			.addTextDisplayComponents(
				new Djs.TextDisplayBuilder().setContent(
					dedent(`# ${ul("configuration.menu.mode.title").toTitle(true)}
                - __${ul("configuration.follow.role.title")}__${s}: \`${mode.followOnlyRole ? "✓" : "✕"}\`
								- __${ul("configuration.follow.thread.title")}__${s}: \`${mode.followOnlyChannel ? "✓" : "✕"}\`
								- __${ul("configuration.roleIn.name")}__${s}: \`${mode.followOnlyRoleIn ? "✓" : "✕"}\``)
				)
			)
			.addSeparatorComponents(
				new Djs.SeparatorBuilder()
					.setSpacing(Djs.SeparatorSpacingSize.Small)
					.setDivider(true)
			)
			.addTextDisplayComponents(
				new Djs.TextDisplayBuilder().setContent(
					dedent(`# ${ul("configuration.menu.autoUpdate.title").toTitle(true)}
					${autoFinal}`)
				)
			),
	];
	await interaction.reply({ components, flags: Djs.MessageFlags.IsComponentsV2 });
}
