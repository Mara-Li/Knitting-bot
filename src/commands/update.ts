import * as Djs from "discord.js";
import { getUl, t } from "../i18n";
import type { Translation } from "../interfaces";
import { fetchArchived, updateCache } from "../utils";
import { addRoleAndUserToThread } from "../utils/add";
import { checkThread } from "../utils/data_check";
import "../discord_ext.js";
import db from "../database";
import { runWithConcurrency } from "../utils/concurrency";

export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("commands.name")
		.setDescriptions("commands.description")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.thread")
				.setDescriptions("commands.updateSpecificThread.description")
				.addChannelOption((option) =>
					option
						.setNames("common.thread")
						.setDescriptions("commands.updateSpecificThread.option.description")
						.setRequired(false)
						.addChannelTypes(Djs.ChannelType.PrivateThread, Djs.ChannelType.PublicThread)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("commands.updateAllThreads.name")
				.setDescriptions("commands.updateAllThreads.description")
				.addBooleanOption((opt) =>
					opt
						.setNames("common.archived")
						.setDescriptions("commands.updateAllThreads.option")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("commands.help.name")
				.setDescriptions("commands.help.description")
		),
	async execute(interaction: Djs.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const ul = getUl(interaction);

		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		switch (commands) {
			case t("commands.updateAllThreads.name"):
				await updateAllThreads(
					interaction,
					ul,
					options.getBoolean(t("common.archived")) ?? false
				);
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
 */
async function updateAllThreads(
	interaction: Djs.CommandInteraction,
	ul: Translation,
	includeArchived?: boolean
) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	await interaction.deferReply();
	const threads = await interaction.guild.channels.fetchActiveThreads(true);
	const toUpdate = new Set<Djs.ThreadChannel>();
	if (includeArchived) {
		//fetch archived threads
		const archived = await fetchArchived(interaction.guild);
		for (const thread of archived) toUpdate.add(thread);
	}
	//merge both collections
	for (const thread of threads.threads.values()) toUpdate.add(thread);

	const count = toUpdate.size;
	await updateCache(interaction.guild, true);
	// Build tasks for threads that should be updated
	const tasks: (() => Promise<void>)[] = [];
	for (const thread of toUpdate) {
		if (thread.locked) continue;
		const shouldUpdate =
			(!db.settings.get(guild, "configuration.followOnlyChannel") &&
				!checkThread(thread, "ignore")) ||
			checkThread(thread, "follow");
		if (shouldUpdate) {
			tasks.push(async () => {
				try {
					await thread.members.fetch({ cache: true });
					await addRoleAndUserToThread(thread, includeArchived);
				} catch (err) {
					console.error(`Error updating thread ${thread.id}:`, err);
				}
			});
		}
	}

	// Execute tasks with concurrency control using utility helper
	await runWithConcurrency(tasks, 10);

	await interaction.editReply({
		content: ul("commands.updateAllThreads.success", {
			count: count,
		}) as string,
	});
}

/**
 * Update the thread with adding the role and the user needed
 * - If not thread is provided, the thread is the current channel
 */
async function updateThread(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const threadOption =
		interaction.options.get(ul("common.thread").toLowerCase()) ?? interaction;
	const channel = threadOption?.channel;
	await interaction.deferReply({ flags: Djs.MessageFlags.Ephemeral });

	if (!channel || !(channel instanceof Djs.ThreadChannel)) {
		await interaction.editReply({
			content: ul("commands.error"),
		});
		return;
	}
	await updateCache(interaction.guild, true);

	if (channel.archived) {
		//unarchive
		await channel.setArchived(false, "Manual update of thread");
		await channel.members.fetch({ cache: true }); //fetch members after unarchive
	}

	const mention = Djs.channelMention(channel?.id as string);
	const isFollowed =
		db.settings.get(guild, "configuration.followOnlyChannel") &&
		checkThread(threadOption?.channel as Djs.ThreadChannel, "follow");

	if (
		!db.settings.get(guild, "configuration.followOnlyRoleIn") &&
		checkThread(threadOption?.channel as Djs.ThreadChannel, "ignore") &&
		!isFollowed
	) {
		await interaction.editReply({
			content: ul("ignore.message", { thread: mention }) as string,
		});
		return;
	}
	await addRoleAndUserToThread(channel);
	await interaction.editReply({
		content: ul("commands.success", { channel: mention }) as string,
	});
}

/**
 * Display the help message
 */
async function displayHelp(interaction: Djs.CommandInteraction, ul: Translation) {
	const constructDesc: string = ((((ul("commands.help.desc") as string) +
		ul("commands.help.all")) as string) + ul("commands.help.thread")) as string;
	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("commands.help.title") as string)
		.setDescription(constructDesc)
		.setColor("#53dcaa");
	await interaction.reply({ embeds: [embed] });
}
