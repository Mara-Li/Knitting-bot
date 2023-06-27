import { CategoryChannel, 
	CommandInteraction, 
	CommandInteractionOptionResolver, 
	EmbedBuilder, 
	PermissionFlagsBits, 
	Role, SlashCommandBuilder,
	TextChannel, 
	ThreadChannel } from "discord.js";
import { default as i18next } from "../i18n/i18next";
import { CommandName, 
	getIgnoredCategories, 
	getIgnoredRoles, 
	getIgnoredTextChannels, 
	getIgnoredThreads, 
	set } from "../maps";
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
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("list")
				.setDescription("List all ignored channels, threads, categories and roles")
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
		case "list":
			await listIgnored(interaction);
			break;
		default:
			await listIgnored(interaction);
			break;
		}
	},
};

async function listIgnored(interaction: CommandInteraction) {
	const ignoredCategories = getIgnoredCategories() as CategoryChannel[] ?? [];
	const ignoredThreads = getIgnoredThreads() as ThreadChannel[] ?? [];
	const ignoredChannels = getIgnoredTextChannels() as TextChannel[] ?? [];
	const ignoredRoles = getIgnoredRoles() as Role[] ?? [];
	const ignoredCategoriesNames = "\n- " + ignoredCategories.map((category) => category.name).join("\n- ");
	const ignoredThreadsNames = "\n- " + ignoredThreads.map((thread) => thread.name).join("\n-");
	const ignoredChannelsNames = "\n- " + ignoredChannels.map((channel) => channel.name).join("\n-");
	const ignoredRolesNames = "\n- " + ignoredRoles.map((role) => role.name).join("\n-");

	const embed = new EmbedBuilder()
		.setColor("#2f8e7d")
		.setTitle(i18next.t("ignore.list.title") as string)
		.addFields({
			name: i18next.t("ignore.list.category") as string,
			value: ignoredCategoriesNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("common.thread") as string,
			value: ignoredThreadsNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("ignore.list.channel") as string,
			value: ignoredChannelsNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("ignore.list.role") as string,
			value: ignoredRolesNames || i18next.t("ignore.list.none") as string,
		});
	await interaction.reply({
		embeds: [embed],
		ephemeral: true,
	});
}

async function ignoreThisRole(interaction: CommandInteraction) {
	const role = interaction.options.get("role");
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
		ignoreThisCategory(interaction, toIgnore);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ThreadChannel) {
		ignoreThisThread(interaction, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof TextChannel) {
		ignoreThisChannel(interaction, toIgnore.channel);
	} else {
		await interaction.reply({
			content: i18next.t("ignore.error") as string,
			ephemeral: true,
		});
		return;
	}
}

async function ignoreThisCategory(interaction: CommandInteraction, ignoreCategory?: CategoryChannel) {
	const allIgnoredCategories:CategoryChannel[] = getIgnoredCategories() as CategoryChannel[] ?? [];
	logInDev("allIgnoredCategories", allIgnoredCategories.map((category) => category.name));
	if (!ignoreCategory) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
	const isAlreadyIgnored = allIgnoredCategories.some(
		(ignoredCategory: CategoryChannel) => ignoredCategory.id === ignoreCategory?.id
	);
	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoredCategories: CategoryChannel[] = allIgnoredCategories.filter(
			(ignoredCategory: CategoryChannel) => ignoredCategory.id !== ignoreCategory?.id
		);
		set(CommandName.ignoreCategory, newIgnoredCategories);
		await interaction.reply({
			content: i18next.t("ignore.thread.remove", {category: ignoreCategory}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnoredCategories.push(ignoreCategory);
		set(CommandName.ignoreCategory, allIgnoredCategories);
		await interaction.reply({
			content: i18next.t("ignore.thread.success", {category: ignoreCategory}) as string,
			ephemeral: true,
		});
	}
}

async function ignoreThisChannel(interaction: CommandInteraction, ignoreChannel?:TextChannel) {
	const allIgnoreChannels:TextChannel[] = getIgnoredTextChannels() as TextChannel[] ?? [];
	logInDev("allIgnoreChannels", allIgnoreChannels.map((channel) => channel.id));
	if (!ignoreChannel || ignoreChannel?.isThread() || ignoreChannel?.isDMBased() ) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
	const ignoreChannels:boolean = allIgnoreChannels.some(
		(channel: TextChannel) => channel.id === ignoreChannel?.id
	);
	if (ignoreChannels) {
		//remove from ignore list
		const newIgnoreChannels: TextChannel[] = allIgnoreChannels.filter(
			(channel: TextChannel) => channel.id !== ignoreChannel?.id
		);
		set(CommandName.ignoreChannel, newIgnoreChannels);
		await interaction.reply({
			content: i18next.t("ignore.thread.remove", {thread: ignoreChannel}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnoreChannels.push(ignoreChannel);
		set(CommandName.ignoreChannel, allIgnoreChannels);
		await interaction.reply({
			content: i18next.t("ignore.thread.success", {thread: ignoreChannel}) as string,
			ephemeral: true,
		});
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
