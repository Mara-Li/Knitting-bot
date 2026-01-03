import {
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	channelMention,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	ThreadChannel,
} from "discord.js";
import { getUl, t } from "../i18n";
import { CommandName, type Translation } from "../interface";
import { getConfig } from "../maps";
import { updateCache } from "../utils";
import { addRoleAndUserToThread } from "../utils/add";
import { checkThread } from "../utils/data_check";
import "../discord_ext";

export default {
	data: new SlashCommandBuilder()
		.setNames("commands.name")
		.setDescriptions("commands.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.thread")
				.setDescriptions("commands.updateSpecificThread.description")
				.addChannelOption((option) =>
					option
						.setNames("common.thread")
						.setDescriptions("commands.updateSpecificThread.option.description")
						.setRequired(false)
						.addChannelTypes(ChannelType.PrivateThread, ChannelType.PublicThread)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("commands.updateAllThreads.name")
				.setDescriptions("commands.updateAllThreads.description")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("commands.help.name")
				.setDescriptions("commands.help.description")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const ul = getUl(interaction);

		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		switch (commands) {
			case t("commands.updateAllThreads.name"):
				await updateAllThreads(interaction, ul);
				break;
			case t("common.thread").toLowerCase():
				await updateThread(interaction, ul);
				break;
			case t("commands.help.name"):
				await displayHelp(interaction, ul);
				break;
			default:
				await displayHelp(interaction, ul);
		}
	},
};

/**
 * Update all thread, unless they are ignored
 * @param interaction {@link CommandInteraction} The interaction, contains the guild to update + reply to it
 * @param ul
 */
async function updateAllThreads(interaction: CommandInteraction, ul: Translation) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const threads = interaction.guild.channels.cache.filter((channel) =>
		channel.isThread()
	);
	await interaction.reply({
		content: ul("commands.updateAllThreads.reply") as string,
	});
	const count = threads.size;
	await updateCache(interaction.guild);
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
		content: ul("commands.updateAllThreads.success", {
			count: count,
		}) as string,
	});
}

/**
 * Update the thread with adding the role and the user needed
 * @param interaction {@link CommandInteraction} The interaction, contains the thread to update
 * - If not thread is provided, the thread is the current channel
 * @param ul
 */
async function updateThread(interaction: ChatInputCommandInteraction, ul: Translation) {
	if (!interaction.guild) return;
	await updateCache(interaction.guild);
	const guild = interaction.guild.id;
	const threadOption =
		interaction.options.get(ul("common.thread").toLowerCase()) ?? interaction;
	const channel = threadOption?.channel;
	if (!channel || !(channel instanceof ThreadChannel)) {
		await interaction.reply({
			content: ul("commands.error") as string,
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
			content: ul("ignore.message", { thread: mention }) as string,
		});
		return;
	}
	if (!interaction.guild) return;
	await interaction.deferReply({});
	await addRoleAndUserToThread(channel);
	await interaction.editReply({
		content: ul("commands.success", { channel: mention }) as string,
	});
}

/**
 * Display the help message
 * @param interaction {@link CommandInteraction} The trigger, to reply to it
 * @param ul
 */
async function displayHelp(interaction: CommandInteraction, ul: Translation) {
	const constructDesc: string = ((((ul("commands.help.desc") as string) +
		ul("commands.help.all")) as string) + ul("commands.help.thread")) as string;
	const embed = new EmbedBuilder()
		.setTitle(ul("commands.help.title") as string)
		.setDescription(constructDesc)
		.setColor("#53dcaa");
	await interaction.reply({ embeds: [embed] });
}
