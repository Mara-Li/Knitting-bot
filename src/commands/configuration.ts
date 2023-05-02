import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { default as i18next, languageValue } from "../i18n/i18next";
import { set, CommandName } from "../maps";

enum CommandsBuilder {
	language = "language",
	member = "on-member-update",
	thread = "on-thread-created",
	channel = "on-channel-update",
	newMember = "on-new-member",
}

export default {
	data: new SlashCommandBuilder()
		.setName("edit-server-config")
		.setDescription("Edit the server configuration. Allow to disable / enable some events")
		.setDescriptionLocalizations({
			fr: "Modifie la configuration du serveur. Permet d'activer / désactiver certains évènements",
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(CommandsBuilder.language)
				.setDescription("Change the bot language")
				.setDescriptionLocalizations({
					fr: "Change la langue du bot",
				})
				.addStringOption((option) =>
					option
						.setName(CommandsBuilder.language)
						.setDescription("Language to use")
						.setDescriptionLocalizations({
							fr: "Langue à utiliser",	
						})
						.addChoices(
							{ name: "English", value: "en" },
							{ name: "Français", value: "fr" },
						)
						.setRequired(true),
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
						.setName("action")
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
				.setDescription("Enable or disable the adding of members on thread created event")
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'ajout des membres des threads lors de leur création",
				})
				.addBooleanOption((option) =>
					option
						.setName("action")
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
				.setDescription("Enable or disable the adding of members on channel update event")
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'ajout des membres des threads lors de leur création",
				})
				.addBooleanOption((option) =>
					option
						.setName("action")
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
				.setDescription("Enable or disable the adding of members on new member event")
				.setDescriptionLocalizations({
					fr: "Active ou désactive l'ajout des membres des threads lors de leur création",
				})
				.addBooleanOption((option) =>
					option
						.setName("action")
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
			const mapsCommands:any = {
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
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				await interaction.reply(`${i18next.t("reply.language", { lang: languageValue[newValue] })}`);
			} else if (commands === CommandsBuilder.channel) {
				await getBooleanAndReply(interaction, mapsCommands[CommandsBuilder.channel], options.getBoolean("action") ?? false);
			} else if (commands === CommandsBuilder.member) {
				await getBooleanAndReply(interaction, mapsCommands[CommandsBuilder.member], options.getBoolean("action") ?? false);
			} else if (commands === CommandsBuilder.newMember) {
				await getBooleanAndReply(interaction, mapsCommands[CommandsBuilder.newMember], options.getBoolean("action") ?? false);
			} else if (commands === CommandsBuilder.thread) {
				await getBooleanAndReply(interaction, mapsCommands[CommandsBuilder.thread], options.getBoolean("action") ?? false);
			}
		}
		catch (e) {
			console.error(e);
			await interaction.reply({
				content: `${i18next.t("error", {error: e})}`,
				ephemeral: true
			});
		}
	}
};

async function getBooleanAndReply(interaction: CommandInteraction, option: CommandName, value: boolean) {
	set(option, value);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const optionTranslation : any = {
		onMemberUpdate: "**__" + i18next.t("commands.onMemberUpdate.desc").toLowerCase() + "__**",
		onThreadCreated: "**__" + i18next.t("commands.onThreadCreated.desc").toLowerCase() + "__**",
		onChannelUpdate: "**__" + i18next.t("commands.onChannelUpdate.desc").toLowerCase() + "__**",
		onNewMember: "**__" + i18next.t("commands.onNewMember.desc").toLowerCase() + "__**",
	};
	if (value) {
		return interaction.reply({
			content : `${i18next.t("reply.enable", { type: optionTranslation[option] })}`,
			ephemeral: true
		});
	} else {
		return interaction.reply({
			content:`${i18next.t("reply.disable", { type: optionTranslation[option] })}`, ephemeral: true
		});
	}
}
