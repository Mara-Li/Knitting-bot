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
import { getConfig, getMaps, getRole, getRoleIn, setIgnore, setRole } from "../maps";
import { TypeName, CommandName } from "../interface";
import {logInDev } from "../utils";
import { interactionRoleInChannel } from "./utils";

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
				.setName(en("common.channel").toLowerCase())
				.setNameLocalizations({
					fr: fr("common.channel").toLowerCase(),
				})
				.setDescription(en("ignore.thread.description"))
				.setDescriptionLocalizations({
					fr: fr("ignore.thread.description"),
				})
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.channel").toLowerCase(),
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
				.setName("role-in")
				.setDescription("Ignore only a role in a specific channel")
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setDescription("The role to ignore")
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setDescription("The channel where the role will be ignored")
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
		switch (commands) {
		case en("common.channel").toLowerCase():
			if (getConfig(CommandName.followOnlyChannel)) {
				await interaction.reply({
					content: i18next.t("ignore.followError") as string,
					ephemeral: true,
				});
				return;
			}
			await ignoreText(interaction);
			break;
		case en("common.role").toLowerCase():
			if (getConfig(CommandName.followOnlyRole)) {
				await interaction.reply({
					content: i18next.t("ignore.followError") as string,
					ephemeral: true,
				});
				return;
			}
			await ignoreThisRole(interaction);
			break;
		case "role-in":
			await interactionRoleInChannel(interaction, "ignore");
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
	const ignoredCategories = getMaps("ignore",TypeName.category) as CategoryChannel[] ?? [];
	const ignoredThreads = getMaps("ignore",TypeName.thread) as ThreadChannel[] ?? [];
	const ignoredChannels = getMaps("ignore",TypeName.channel) as TextChannel[] ?? [];
	const ignoredForum = getMaps("ignore",TypeName.forum) as ForumChannel[] ?? [];
	const ignoredRoles = getRole("ignore");
	
	const ignoredRolesIn = getRoleIn("ignore");
	const ignoredRolesInMaps = ignoredRolesIn.map((roleIn) =>{
		const role = roleIn.role.id;
		const channels = roleIn.channels.map((channel) => channelMention(channel.id)).join("\n - ");
		return `${roleMention(role)}:\n - ${channels}`;
	}).join("");
	
	const ignoredCategoriesNames = "\n- " + ignoredCategories.map((category) => channelMention(category.id)).join("\n- ");
	const ignoredThreadsNames = "\n- " + ignoredThreads.map((thread) => channelMention(thread.id)).join("\n-");
	const ignoredChannelsNames = "\n- " + ignoredChannels.map((channel) => channel.name).join("\n-");
	const ignoredRolesNames = "\n- " + ignoredRoles.map((role) => roleMention(role.id)).join("\n-");
	const ignoredForumNames = "\n- " + ignoredForum.map((forum) => channelMention(forum.id)).join("\n-");

	const embed = new EmbedBuilder()
		.setColor("#2f8e7d")
		.setTitle(i18next.t("ignore.list.title") as string)
		.addFields({
			name: i18next.t("common.category") as string,
			value: ignoredCategoriesNames || i18next.t("ignore.list.none") as string,
		})
		.addFields({
			name: i18next.t("common.channel") as string,
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
	
	if (ignoredRolesIn.length > 0) {
		const embed2 = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setDescription(ignoredRolesInMaps);
		await interaction.reply({
			embeds: [embed, embed2],
			ephemeral: true,
		});
	} else {
		await interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	}
}

async function ignoreThisRole(interaction: CommandInteraction) {
	const role = interaction.options.get(en("common.role").toLowerCase());
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", {role: role?.name}) as string,
			ephemeral: true,
		});
		return;
	}
	const mention = role?.role.id ? roleMention(role.role.id) : role.role?.name;
	const allIgnoreRoles:Role[] = getRole("ignore");
	logInDev("allIgnoreRoles", allIgnoreRoles.map((role) => role.id));
	const isAlreadyIgnored = allIgnoreRoles.some(
		(ignoredRole: Role) => ignoredRole.id === role.role?.id
	);

	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoreRoles: Role[] = allIgnoreRoles.filter(
			(ignoredRole: Role) => ignoredRole.id !== role.role?.id
		);
		setRole("ignore", newIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.removed", {role: mention}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnoreRoles.push(role.role);
		setRole("ignore", allIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.added", {role: mention}) as string,
			ephemeral: true,
		});
	}
}

async function ignoreText(interaction: CommandInteraction) {
	const toIgnore = interaction.options.get(en("common.channel").toLowerCase()) ?? interaction;
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
		allIgnored = getMaps("ignore",TypeName.category) as CategoryChannel[] ?? [];
		break;
	case TypeName.thread:
		allIgnored = getMaps("ignore",TypeName.thread) as ThreadChannel[] ?? [];
		break;
	case TypeName.channel:
		allIgnored = getMaps("ignore",TypeName.channel) as TextChannel[] ?? [];
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
			content: i18next.t("ignore.thread.remove", {thread: mention}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allIgnored.push(ignoreCategory);
		setIgnore(typeName, allIgnored);
		await interaction.reply({
			content: i18next.t("ignore.thread.success", {thread: mention}) as string,
			ephemeral: true,
		});
	}
}

