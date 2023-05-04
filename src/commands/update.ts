import {
	CommandInteraction,
	CommandInteractionOptionResolver, EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	ThreadChannel,
} from "discord.js";
import { addRoleAndUserToThread } from "../utils";
import { default as i18next } from "../i18n/i18next";
const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName(en("commands.name"))
		.setNameLocalizations({
			fr: fr("commands.name"),	
		})
		.setDescription(en("commands.description"))
		.setDescriptionLocalizations({
			fr: fr("commands.description"),	
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("commands.updateSpecificThread.name"))
				.setDescription(en("commands.updateSpecificThread.description"))
				.setDescriptionLocalizations({ 
					fr: fr("commands.updateSpecificThread.description"), 
				})
				.addChannelOption(option =>
					option.setName(en("commands.updateSpecificThread.option.name"))
						.setDescription(en("commands.updateSpecificThread.option.description"))
						.setDescriptionLocalizations({
							fr: fr("commands.updateSpecificThread.option.description"),
						})
						.setRequired(true)
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("commands.updateThread.name"))
				.setDescription(en("commands.updateThread.description"))
				.setDescriptionLocalizations({
					fr: fr("commands.updateThread.description"),
				})
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName(en("commands.updateAllThreads.name"))
				.setDescription(en("commands.updateAllThreads.description"))
				.setDescriptionLocalizations({
					fr: fr("commands.updateAllThreads.description")
				})
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		switch (commands) {
		case en("commands.updateAllThreads.name"):
			await updateAllThreads(interaction);
			break;
		case en("commands.updateThread.name"):
			await updateThisThread(interaction);
			break;
		case en("commands.updateSpecificThread.name"):
			await updateSpecificThread(interaction);
			break;
		default:
			await displayHelp(interaction);
		}
	}
	
};

async function updateAllThreads(interaction: CommandInteraction) {
	if (!interaction.guild) return;
	const threads = interaction.guild.channels.cache.filter(channel => channel.isThread());
	await interaction.reply({ content: i18next.t("commands.updateAllThreads.reply") as string, ephemeral: true });
	const count = threads.size;
	for (const thread of threads.values()) {
		const threadChannel = thread as ThreadChannel;
		await addRoleAndUserToThread(threadChannel);
	}
	await interaction.followUp({ content: i18next.t("commands.updateAllThreads.success", { count: count }) as string, ephemeral: true });
}

async function updateThisThread(interaction: CommandInteraction) {
	if (!interaction.channel || !(interaction.channel instanceof ThreadChannel)) {
		await interaction.reply({ content: i18next.t("commands.error") as string, ephemeral: true });
		return;
	}
	try {
		await interaction.reply({ content: `${i18next.t("commands.success", {channel: interaction.channel.name}) as string}`, ephemeral: true});
		const thread = interaction.channel as ThreadChannel;
		await addRoleAndUserToThread(thread);
	}
	catch (e) {
		console.error(e);
		await interaction.reply({ content: i18next.t("error", {error: e}) as string, ephemeral: true });
	}
}

async function updateSpecificThread(interaction: CommandInteraction) {
	const threadOption = interaction.options.get("thread");
	const channelId = threadOption?.channel?.name;
	await interaction.reply({ content: i18next.t("commands.success", {channel: channelId}) as string, ephemeral: true });
	if (!interaction.guild) return;
	const thread = threadOption?.channel as ThreadChannel;
	if (!thread || !thread.isThread()) {
		await interaction.followUp({ content: i18next.t("commands.error") as string, ephemeral: true });
		return;
	}
	await addRoleAndUserToThread(thread);
}

async function displayHelp(interaction: CommandInteraction) {
	const constructDesc: string = i18next.t("commands.help.desc") as string +
		i18next.t("commands.help.all") as string +
		i18next.t("commands.help.here") as string +
		i18next.t("commands.help.thread") as string;
	const embed = new EmbedBuilder()
		.setTitle(i18next.t("commands.help.title") as string)
		.setDescription(constructDesc)
		.setColor("#53dcaa");
	await interaction.reply({ embeds: [embed], ephemeral: true });
}
