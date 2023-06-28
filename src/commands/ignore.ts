import { channelMention, roleMention } from "@discordjs/formatters";
import {
	CategoryChannel,
	CommandInteraction,
	CommandInteractionOptionResolver,
	EmbedBuilder,
	ForumChannel,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { default as i18next } from "../i18n/i18next";
import { CommandName, get, getIgnored, setIgnore, TypeName } from "../maps";
import {logInDev } from "../utils";

const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName("ignore")
		.setDescription(en("ignore.description"))
		.setDescriptionLocalizations({
			fr: fr("ignore.description"),
		})
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
				.setName(en("common.role").toLowerCase())
				.setNameLocalizations({
					fr: fr("common.role").toLowerCase(),
				})
				.setDescription(en("ignore.role.description"))
				.setDescriptionLocalizations({
					fr: fr("ignore.role.description"),
				})
				
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.role").toLowerCase(),
						})
						.setDescription(en("ignore.role.option"))
						.setDescriptionLocalizations({
							fr: fr("ignore.role.option"),
						})
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.list"))
				.setNameLocalizations({
					fr: fr("common.list"),
				})
				.setDescription(en("ignore.list.description"))
				.setDescriptionLocalizations({
					fr: fr("ignore.list.description"),
				})
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		/**
		 * Verify if the "follow-only" mode is enabled ; return error if it is
		 */
		if (get(CommandName.followOnly)) {
			await interaction.reply({
				content: i18next.t("ignore.followError") as string,
				ephemeral: true,
			});
			return;
		}
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
	const ignoredCategories = getIgnored(TypeName.category) as CategoryChannel[] ?? [];
	const ignoredThreads = getIgnored(TypeName.thread) as ThreadChannel[] ?? [];
	const ignoredChannels = getIgnored(TypeName.channel) as TextChannel[] ?? [];
	const ignoredForum = getIgnored(TypeName.forum) as ForumChannel[] ?? [];
	const ignoredRoles = getIgnored(TypeName.role) as Role[] ?? [];
	const ignoredCategoriesNames = "\n- " + ignoredCategories.map((category) => category.name).join("\n- ");
	const ignoredThreadsNames = "\n- " + ignoredThreads.map((thread) => thread.name).join("\n-");
	const ignoredChannelsNames = "\n- " + ignoredChannels.map((channel) => channel.name).join("\n-");
	const ignoredRolesNames = "\n- " + ignoredRoles.map((role) => role.name).join("\n-");
	const ignoredForumNames = "\n- " + ignoredForum.map((forum) => forum.name).join("\n-");

	const embed = new EmbedBuilder()
		.setColor("#2f8e7d")
		.setTitle(i18next.t("ignore.list.title") as string)
		.addFields({
			name: i18next.t("common.category") as string,
			value: ignoredCategoriesNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("common.thread") as string,
			value: ignoredThreadsNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("common.channel") as string,
			value: ignoredChannelsNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("common.forum") as string,
			value: ignoredForumNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("common.role") as string,
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
			content: i18next.t("ignore.role.error", {role: role?.name}) as string,
			ephemeral: true,
		});
		return;
	}
	const mention = role?.role.id ? roleMention(role.role.id) : role.role?.name;
	const allIgnoreRoles:Role[] = getIgnored(TypeName.role) as Role[] ?? [];
	logInDev("allIgnoreRoles", allIgnoreRoles.map((role) => role.id));
	const isAlreadyIgnored = allIgnoreRoles.some(
		(ignoredRole: Role) => ignoredRole.id === role.role?.id
	);

	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoreRoles: Role[] = allIgnoreRoles.filter(
			(ignoredRole: Role) => ignoredRole.id !== role.role?.id
		);
		setIgnore(TypeName.role, newIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.removed", {role: mention}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnoreRoles.push(role.role);
		setIgnore(TypeName.role, allIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.added", {role: mention}) as string,
			ephemeral: true,
		});
	}
}

async function ignoreText(interaction: CommandInteraction) {
	const toIgnore = interaction.options.get("thread") ?? interaction;
	if (toIgnore.channel instanceof CategoryChannel) {
		await ignoreThis(interaction, TypeName.category, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ThreadChannel) {
		await ignoreThis(interaction, TypeName.thread, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof TextChannel) {
		await ignoreThis(interaction, TypeName.channel, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ForumChannel) {
		await ignoreThis(interaction, TypeName.forum, toIgnore.channel);
	} else {
		await interaction.reply({
			content: i18next.t("ignore.error") as string,
			ephemeral: true,
		});
		return;
	}
}

async function ignoreThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	ignoreCategory?: CategoryChannel
		| ThreadChannel
		| TextChannel
		| ForumChannel) {
	if (!ignoreCategory) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
	let allIgnored: (ThreadChannel<boolean> | CategoryChannel | TextChannel | ForumChannel)[] = [];
	switch (typeName) {
	case TypeName.category:
		allIgnored = getIgnored(TypeName.category) as CategoryChannel[] ?? [];
		break;
	case TypeName.thread:
		allIgnored = getIgnored(TypeName.thread) as ThreadChannel[] ?? [];
		break;
	case TypeName.channel:
		allIgnored = getIgnored(TypeName.channel) as TextChannel[] ?? [];
		break;
	}
	const isAlreadyIgnored = allIgnored.some(
		(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel | Role ) => ignoredCategory.id === ignoreCategory?.id
	);
	const mention = ignoreCategory?.id ? channelMention(ignoreCategory.id) : ignoreCategory?.name;
	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoredCategories = allIgnored.filter(
			(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel | Role) => ignoredCategory.id !== ignoreCategory?.id
		);
		setIgnore(typeName, newIgnoredCategories);
		await interaction.reply({
			content: i18next.t("ignore.thread.remove", {category: mention}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnored.push(ignoreCategory);
		setIgnore(typeName, allIgnored);
		await interaction.reply({
			content: i18next.t("ignore.thread.success", {category: mention}) as string,
			ephemeral: true,
		});
	}
}

