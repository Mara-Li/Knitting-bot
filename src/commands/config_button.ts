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
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	CacheType,
	CommandInteraction,
	EmbedBuilder,
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
		}),
	async execute(interaction: CommandInteraction) {
		
		
		/** Add buttons to row */
		
		const row = reloadButton();

		const embed = await display();
		
		await interaction.reply(
			{
				embeds: [embed],
				components: row
			});
		
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
 * Display the configuration as an embed
 */
export async function display() {
	return new EmbedBuilder()
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
}

/**
 * Return the translation if value is true or false
 * @param {boolean} value The value to check
 */
function enabledOrDisabled(value: boolean) {
	return value ? i18next.t("enable.enable") : i18next.t("common.disabled");
}

/**
 * Update the configuration and edit the interaction message with the new configuration
 * @param command {@link CommandName}
 * @param interaction
 */
async function updateConfig(command: CommandName, interaction: ButtonInteraction<CacheType> | StringSelectMenuInteraction) {
	let newConfig: string | boolean;
	if (command === CommandName.language) {
		const interactSelect = interaction as StringSelectMenuInteraction;
		newConfig = interactSelect.values[0];
		// reload i18next
		await i18next.changeLanguage(newConfig as string);
		setConfig(command, newConfig);
		const embed = await display();
		//reload buttons
		const rows = reloadButton();
		await interaction.editReply({ embeds: [embed], components: rows });
	} else if (command === CommandName.followOnlyRoleIn && (getConfig(CommandName.followOnlyChannel) || getConfig(CommandName.followOnlyRole))) {
		const embed = await display();
		//reload buttons
		const rows = reloadButton();
		await interaction.editReply({ embeds: [embed], components: rows });
		interaction.editReply({ content: `**${i18next.t("configuration.roleIn.error")}**` });
	} else if (command === CommandName.manualMode) {
		const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember];
		const allTruc = truc.map((command) => getConfig(command));
		const manualMode = allTruc.every((value) => value);
		for (const command of truc) {
			setConfig(command, !manualMode);
		}
		const embed = await display();
		//reload buttons
		const rows = reloadButton();
		await interaction.editReply({ embeds: [embed], components: rows });
	} else {
		newConfig = !getConfig(command);
		interaction.editReply({ content: ""});
		setConfig(command, newConfig);
		const embed = await display();
		//reload buttons
		const rows = reloadButton();
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

export function createRows(buttons: ButtonBuilder[]) {
	return[
		{
			type: 1,
			components: [createLanguageButton()]
		},
		{
			type: 1,
			components: [buttons[1]]
		},
		{
			type: 1,
			components: [buttons[2], buttons[3], buttons[4], buttons[5]]
		},
		{
			type: 1,
			components: [buttons[6], buttons[7], buttons[8]]
		}];
}

function reloadButton() {
	const labelButton = (id: CommandName) => {
		//eslint-disable-next-line @typescript-eslint/no-explicit-any
		const translation:any = {
			[CommandName.manualMode] : i18next.t("configuration.disable.name"),
			[CommandName.channel] : i18next.t("configuration.channel.name"),
			[CommandName.member] : i18next.t("configuration.member.name"),
			[CommandName.newMember] : i18next.t("configuration.newMember.name"),
			[CommandName.thread] : i18next.t("configuration.thread.name"),
			[CommandName.followOnlyRoleIn] : i18next.t("configuration.roleIn.name"),
			[CommandName.followOnlyRole] : i18next.t("configuration.follow.role.name"),
			[CommandName.followOnlyChannel] : i18next.t("configuration.follow.thread.name"),
		};
		const idIndex = Object.values(CommandName).indexOf(id);
		const value = Object.values(CommandName)[idIndex];
		const translated = translation[value];
		if (id === CommandName.manualMode) {
			const truc = [CommandName.channel, CommandName.member, CommandName.thread, CommandName.newMember].map((command) => getConfig(command));
			const manualMode = truc.some((value) => value);
			return manualMode ? `${i18next.t("common.enable")} : ${translated}` : `${i18next.t("common.disable")} : ${translated}`;
		}
		return getConfig(id) ? `${i18next.t("common.disable")} : ${translated}` : `${i18next.t("common.enable")} : ${translated}`;
	};
	const buttons: ButtonBuilder[] = [];
	
	for (const id of Object.values(CommandName)) {
		buttons.push(createButton(id as CommandName, labelButton(id as CommandName)));
	}
	return createRows(buttons);
}
