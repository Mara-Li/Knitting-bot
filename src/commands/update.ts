import {
	ChannelType,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
	ThreadChannel,
	channelMention,
} from "discord.js";
import { cmdLn } from "../i18n";
import { default as i18next } from "../i18n/init";
import { CommandName } from "../interface";
import { getConfig } from "../maps";
import { addRoleAndUserToThread } from "../utils/add";
import { checkThread } from "../utils/data_check";

const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName(en("commands.name"))
		.setNameLocalizations(cmdLn("commands.name"))
		.setDescription(en("commands.description"))
		.setDescriptionLocalizations(cmdLn("commands.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.thread").toLowerCase())
				.setNameLocalizations(cmdLn("common.thread", true))
				.setDescription(en("commands.updateSpecificThread.description"))
				.setDescriptionLocalizations(
					cmdLn("commands.updateSpecificThread.description"),
				)
				.addChannelOption((option) =>
					option
						.setName(en("common.thread").toLowerCase())
						.setNameLocalizations(cmdLn("common.thread", true))
						.setDescription(
							en("commands.updateSpecificThread.option.description"),
						)
						.setDescriptionLocalizations(
							cmdLn("commands.updateSpecificThread.option.description"),
						)
						.setRequired(false)
						.addChannelTypes(
							ChannelType.PrivateThread,
							ChannelType.PublicThread,
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("commands.updateAllThreads.name"))
				.setNameLocalizations(cmdLn("commands.updateAllThreads.name"))
				.setDescription(en("commands.updateAllThreads.description"))
				.setDescriptionLocalizations(
					cmdLn("commands.updateAllThreads.description"),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("commands.help.name"))
				.setNameLocalizations(cmdLn("commands.help.name"))
				.setDescription(en("commands.help.description"))
				.setDescriptionLocalizations(cmdLn("commands.help.description")),
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		switch (commands) {
			case en("commands.updateAllThreads.name"):
				await updateAllThreads(interaction);
				break;
			case en("common.thread").toLowerCase():
				await updateThread(interaction);
				break;
			case en("commands.help.name"):
				await displayHelp(interaction);
				break;
			default:
				await displayHelp(interaction);
		}
	},
};

/**
 * Update all thread, unless they are ignored
 * @param interaction {@link CommandInteraction} The interaction, contains the guild to update + reply to it
 */
async function updateAllThreads(interaction: CommandInteraction) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const threads = interaction.guild.channels.cache.filter((channel) =>
		channel.isThread(),
	);
	await interaction.reply({
		content: i18next.t("commands.updateAllThreads.reply") as string,
		flags: MessageFlags.Ephemeral,
	});
	const count = threads.size;
	for (const thread of threads.values()) {
		const threadChannel = thread as ThreadChannel;
		if (
			!getConfig(CommandName.followOnlyChannel, guild) &&
			!checkThread(threadChannel, "ignore")
		) {
			await addRoleAndUserToThread(threadChannel);
		} else if (checkThread(threadChannel, "follow")) {
			await addRoleAndUserToThread(threadChannel);
		}
	}
	await interaction.followUp({
		content: i18next.t("commands.updateAllThreads.success", {
			count: count,
		}) as string,
		flags: MessageFlags.Ephemeral,
	});
}

/**
 * Update the thread with adding the role and the user needed
 * @param interaction {@link CommandInteraction} The interaction, contains the thread to update
 * - If not thread is provided, the thread is the current channel
 */
async function updateThread(interaction: CommandInteraction) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const threadOption =
		interaction.options.get(i18next.t("common.thread").toLowerCase()) ??
		interaction;
	const channel = threadOption?.channel;
	if (!channel || !(channel instanceof ThreadChannel)) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const mention = channelMention(channel?.id as string);
	const isFollowed =
		getConfig(CommandName.followOnlyChannel, guild) &&
		checkThread(threadOption?.channel as ThreadChannel, "follow");

	if (
		!getConfig(CommandName.followOnlyRoleIn, guild) &&
		checkThread(threadOption?.channel as ThreadChannel, "ignore") &&
		!isFollowed
	) {
		await interaction.reply({
			content: i18next.t("ignore.message", { thread: mention }) as string,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}
	if (!interaction.guild) return;
	await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});
	await addRoleAndUserToThread(channel);
	await interaction.editReply({
		content: i18next.t("commands.success", { channel: mention }) as string,
	});
}

/**
 * Display the help message
 * @param interaction {@link CommandInteraction} The trigger, to reply to it
 */
async function displayHelp(interaction: CommandInteraction) {
	const constructDesc: string = ((((i18next.t("commands.help.desc") as string) +
		i18next.t("commands.help.all")) as string) +
		i18next.t("commands.help.thread")) as string;
	const embed = new EmbedBuilder()
		.setTitle(i18next.t("commands.help.title") as string)
		.setDescription(constructDesc)
		.setColor("#53dcaa");
	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
