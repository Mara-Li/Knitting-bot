import {
	CategoryChannel,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	channelMention,
	EmbedBuilder,
	ForumChannel,
	MessageFlags,
	PermissionFlagsBits,
	Role,
	roleMention,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { cmdLn } from "../i18n";
import { default as i18next } from "../i18n/init";
import { CommandName, TypeName } from "../interface";
import {
	getConfig,
	getMaps,
	getRole,
	getRoleIn,
	setIgnore,
	setRole,
} from "../maps";
import { toTitle } from "../utils";
import { mapToStr } from "./index";
import { interactionRoleInChannel } from "./utils";

const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName("ignore")
		.setDescription(en("ignore.description"))
		.setDescriptionLocalizations(cmdLn("ignore.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.channel").toLowerCase())
				.setNameLocalizations(cmdLn("common.channel", true))
				.setDescription(en("ignore.thread.description"))
				.setDescriptionLocalizations(cmdLn("ignore.thread.description"))
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations(cmdLn("common.channel", true))
						.setDescription(en("ignore.thread.option.description"))
						.setDescriptionLocalizations(
							cmdLn("ignore.thread.option.description"),
						)
						.addChannelTypes(
							ChannelType.GuildCategory,
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildForum,
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.role").toLowerCase())
				.setNameLocalizations(cmdLn("common.role", true))
				.setDescription(en("ignore.role.description"))
				.setDescriptionLocalizations(cmdLn("ignore.role.description"))

				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setNameLocalizations(cmdLn("common.role", true))
						.setDescription(en("ignore.role.option"))
						.setDescriptionLocalizations(cmdLn("ignore.role.option"))
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.roleIn"))
				.setNameLocalizations(cmdLn("common.roleIn"))
				.setDescription(en("ignore.roleIn.description"))
				.setDescriptionLocalizations(cmdLn("ignore.roleIn.description"))
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setDescription(en("ignore.roleIn.option.role"))
						.setDescriptionLocalizations(cmdLn("ignore.roleIn.option.role"))
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setDescription(en("ignore.roleIn.option.chan"))
						.setDescriptionLocalizations(cmdLn("ignore.roleIn.option.chan"))
						.setRequired(false)
						.addChannelTypes(
							ChannelType.GuildCategory,
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildForum,
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.list"))
				.setNameLocalizations(cmdLn("common.list"))
				.setDescription(en("ignore.list.description"))
				.setDescriptionLocalizations(cmdLn("ignore.list.description")),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		/**
		 * Verify if the "follow-only" mode is enabled ; return error if it is
		 */
		switch (commands) {
			case en("common.channel").toLowerCase():
				if (getConfig(CommandName.followOnlyChannel, guild.id)) {
					await interaction.reply({
						content: i18next.t("ignore.followError") as string,
					});
					return;
				}
				await ignoreText(interaction);
				break;
			case en("common.role").toLowerCase():
				if (getConfig(CommandName.followOnlyRole, guild.id)) {
					await interaction.reply({
						content: i18next.t("ignore.followError") as string,
					});
					return;
				}
				await ignoreThisRole(interaction);
				break;
			case en("common.roleIn"):
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

/**
 * Display all ignored channels, roles and categories, but also the channels ignored by roles
 * @param interaction {@link CommandInteraction} the interaction to reply to
 */
async function listIgnored(interaction: ChatInputCommandInteraction) {
	if (!interaction.guild) return;
	const ignored = mapToStr("ignore", interaction.guild.id);
	const roleIn = getRoleIn("ignore", interaction.guild.id);
	const {
		rolesNames: ignoredRolesNames,
		categoriesNames: ignoredCategoriesNames,
		threadsNames: ignoredThreadsNames,
		channelsNames: ignoredChannelsNames,
		rolesInNames: ignoredRolesIn,
		forumNames: ignoredForumNames,
	} = ignored;
	const embed = new EmbedBuilder()
		.setColor("#2f8e7d")
		.setTitle(i18next.t("ignore.list.title"))
		.addFields({
			name: i18next.t("common.category"),
			value: ignoredCategoriesNames || i18next.t("ignore.list.none"),
		})
		.addFields({
			name: i18next.t("common.channel"),
			value: ignoredThreadsNames || i18next.t("ignore.list.none"),
		})
		.addFields({
			name: i18next.t("common.channel"),
			value: ignoredChannelsNames || i18next.t("ignore.list.none"),
		})
		.addFields({
			name: i18next.t("common.forum"),
			value: ignoredForumNames || i18next.t("ignore.list.none"),
		})
		.addFields({
			name: toTitle(i18next.t("common.role")),
			value: ignoredRolesNames || i18next.t("ignore.list.none"),
		});

	if (roleIn.length > 0) {
		const embed2 = new EmbedBuilder()
			.setTitle(i18next.t("ignore.roleIn.title"))
			.setColor("#2f8e7d")
			.setDescription(ignoredRolesIn);
		await interaction.reply({
			embeds: [embed, embed2],
		});
	} else {
		await interaction.reply({
			embeds: [embed],
			
		});
	}
}

/**
 * Ignore a role
 * @param interaction {@link CommandInteraction} the interaction to reply to
 * Also contains the role to ignore
 */
async function ignoreThisRole(interaction: ChatInputCommandInteraction) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const role = interaction.options.get(en("common.role").toLowerCase());
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", { role: role?.name }) as string,
			
		});
		return;
	}
	const mention = role?.role.id ? roleMention(role.role.id) : role.role?.name;
	const allIgnoreRoles: Role[] = getRole("ignore", guild);
	const isAlreadyIgnored = allIgnoreRoles.some(
		(ignoredRole: Role) => ignoredRole.id === role.role?.id,
	);

	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoreRoles: Role[] = allIgnoreRoles.filter(
			(ignoredRole: Role) => ignoredRole.id !== role.role?.id,
		);
		setRole("ignore", guild, newIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.removed", { role: mention }) as string,
			
		});
	} else {
		//add to ignore list
		allIgnoreRoles.push(role.role);
		setRole("ignore", guild, allIgnoreRoles);
		await interaction.reply({
			content: i18next.t("ignore.role.added", { role: mention }) as string,
			
		});
	}
}

/**
 * Ignore a channel, a category or a thread
 * Run the commands based on the type of the channel
 * @param interaction {@link CommandInteraction} the interaction to reply to
 * Also contains the channel to ignore
 */
async function ignoreText(interaction: ChatInputCommandInteraction) {
	const toIgnore =
		interaction.options.get(en("common.channel").toLowerCase()) ?? interaction;
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
			
		});
		return;
	}
}

/**
 * Ignore specified a channel, a category or a thread.
 * Get maps based on the type of the channel
 * @param interaction {@link CommandInteraction} the interaction to reply to
 * @param typeName {@link TypeName} the type of the channel
 * @param ignoreCategory {@link CategoryChannel} the category to ignore
 */
async function ignoreThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	ignoreCategory?: CategoryChannel | ThreadChannel | TextChannel | ForumChannel,
) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	if (!ignoreCategory) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			
		});
		return;
	}
	let allIgnored: (
		| ThreadChannel<boolean>
		| CategoryChannel
		| TextChannel
		| ForumChannel
	)[] = [];
	switch (typeName) {
		case TypeName.category:
			allIgnored =
				(getMaps("ignore", TypeName.category, guild) as CategoryChannel[]) ??
				[];
			break;
		case TypeName.thread:
			allIgnored =
				(getMaps("ignore", TypeName.thread, guild) as ThreadChannel[]) ?? [];
			break;
		case TypeName.channel:
			allIgnored =
				(getMaps("ignore", TypeName.channel, guild) as TextChannel[]) ?? [];
			break;
	}
	const isAlreadyIgnored = allIgnored.some(
		(
			ignoredCategory:
				| CategoryChannel
				| ForumChannel
				| ThreadChannel
				| TextChannel
				| Role,
		) => ignoredCategory.id === ignoreCategory?.id,
	);
	const mention = ignoreCategory?.id
		? channelMention(ignoreCategory.id)
		: ignoreCategory?.name;
	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoredCategories = allIgnored.filter(
			(
				ignoredCategory:
					| CategoryChannel
					| ForumChannel
					| ThreadChannel
					| TextChannel
					| Role,
			) => ignoredCategory.id !== ignoreCategory?.id,
		);
		setIgnore(
			typeName,
			guild,
			newIgnoredCategories as
				| ThreadChannel[]
				| CategoryChannel[]
				| TextChannel[]
				| ForumChannel[],
		);
		await interaction.reply({
			content: i18next.t("ignore.thread.remove", { thread: mention }) as string,
			
		});
	} else {
		//add to ignore list
		allIgnored.push(ignoreCategory);
		setIgnore(
			typeName,
			guild,
			allIgnored as
				| ThreadChannel[]
				| CategoryChannel[]
				| TextChannel[]
				| ForumChannel[],
		);
		await interaction.reply({
			content: i18next.t("ignore.thread.success", {
				thread: mention,
			}) as string,
			
		});
	}
}
