import { CategoryChannel, CommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, Role, SlashCommandBuilder, TextChannel, ThreadChannel } from "discord.js";
import { default as i18next } from "../i18n/i18next";
import { CommandName, getIgnoredRoles, getIgnoredThreads, set } from "../maps";
import { logInDev } from "../utils";

const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName("ignore")
		.setDescription("placeholder")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.thread").toLowerCase())
				.setNameLocalizations({
					fr: fr("common.thread").toLowerCase(),
				})
				.setDescription(en("ignore.thread.description"))
				.setDescriptionLocalizations({
					fr: fr("ignore.thread.description"),
				})
				.addChannelOption((option) =>
					option
						.setName(en("common.thread").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.thread").toLowerCase(),
						})
						.setDescription(
							en("ignore.thread.option.description")
						)
						.setDescriptionLocalizations({
							fr: fr("ignore.thread.option.description"),
						})
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("role")
				.setDescription("placeholder")
				.addRoleOption((option) =>
					option
						.setName("role")
						.setDescription("placeholder")
						.setRequired(true)
				)
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		switch (commands) {
		case "thread":
			await ignoreText(interaction);
			break;
		case "role":
			await ignoreThisRole(interaction);
			break;
		default:
			logInDev("default");
			break;
		}
	},
};


async function ignoreThisRole(interaction: CommandInteraction) {
	const role = interaction.options.get("role");
	console.log(role?.role);
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", {role: role}) as string,
			ephemeral: true,
		});
		return;
	}
	const allIgnoreRoles:Role[] = getIgnoredRoles() as Role[] ?? [];
	logInDev("allIgnoreRoles", allIgnoreRoles.map((role) => role.id));
	const isAlreadyIgnored = allIgnoreRoles.some(
		(ignoredRole: Role) => ignoredRole.id === role.role?.id
	);
	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoreRoles: Role[] = allIgnoreRoles.filter(
			(ignoredRole: Role) => ignoredRole.id !== role.role?.id
		);
		set(CommandName.ignoreRole, newIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.removed", {role: role}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnoreRoles.push(role.role);
		set(CommandName.ignoreRole, allIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.added", {role: role}) as string,
			ephemeral: true,
		});
	}
}

async function ignoreText(interaction: CommandInteraction) {
	const toIgnore = interaction.options.get("thread") ?? interaction;
	if (toIgnore instanceof CategoryChannel) {
		//ignore this category
	} else if (toIgnore?.channel && toIgnore.channel instanceof ThreadChannel) {
		ignoreThisThread(interaction, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof TextChannel) {
		//ignore simple channel
	} else {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
}

async function ignoreThisThread(interaction: CommandInteraction, ignoredChannel?:ThreadChannel) {
	const allIgnoreChannels:ThreadChannel[] = getIgnoredThreads() as ThreadChannel[] ?? [];
	logInDev("allIgnoreChannels", allIgnoreChannels.map((channel) => channel.id));
	if (!ignoredChannel || !(ignoredChannel instanceof ThreadChannel)) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
	if (!ignoredChannel || !ignoredChannel.isThread()) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
	const ignoreChannels:boolean = allIgnoreChannels.some(
		(channel: ThreadChannel) => channel.id === ignoredChannel?.id
	);
	
	if (ignoreChannels) {
		//remove from ignore list
		const newIgnoreChannels: ThreadChannel[] = allIgnoreChannels.filter(
			(channel: ThreadChannel) => channel.id !== ignoredChannel?.id
		);
		set(CommandName.ignoreThread, newIgnoreChannels);
		await interaction.reply({
			content: i18next.t("ignore.thread.remove", {
				thread: ignoredChannel.name,
			}) as string,
			ephemeral: true,
		});
		logInDev(`${ignoredChannel.name} removed from ignore list`);
		return;
	} else {
		const newIgnoreChannels: ThreadChannel[] = allIgnoreChannels.concat(ignoredChannel);
		set(CommandName.ignoreThread, newIgnoreChannels);
		await interaction.reply({
			content: i18next.t("ignore.thread.success", {
				thread: ignoredChannel.name,
			}) as string,
			ephemeral: true,
		});
		logInDev(`${ignoredChannel.name} added to ignore list`);
		return;
	}
}
