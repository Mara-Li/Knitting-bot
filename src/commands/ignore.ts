import {
	CategoryChannel,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	channelMention,
	EmbedBuilder,
	ForumChannel,
	PermissionFlagsBits,
	Role,
	roleMention,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { cmdLn, getUl, t } from "../i18n";
import { CommandName, type Translation, TypeName } from "../interface";
import { getConfig, getMaps, getRole, getRoleIn, setIgnore, setRole } from "../maps";
import { toTitle } from "../utils";
import { mapToStr } from "./index";
import { interactionRoleInChannel } from "./utils";
import "../discord_ext.js";

export default {
	data: new SlashCommandBuilder()
		.setName("ignore")
		.setDescriptions("ignore.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.channel")
				.setDescriptions("ignore.thread.description")
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("ignore.thread.option.description")
						.addChannelTypes(
							ChannelType.GuildCategory,
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildForum
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.role".toLowerCase())
				.setDescriptions("ignore.role.description")
				.addRoleOption((option) =>
					option
						.setNames("common.role".toLowerCase())
						.setNameLocalizations(cmdLn("common.role", true))
						.setDescriptions("ignore.role.option")
						.setDescriptionLocalizations(cmdLn("ignore.role.option"))
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.roleIn")
				.setDescriptions("ignore.roleIn.description")
				.addRoleOption((option) =>
					option
						.setNames("common.role".toLowerCase())
						.setDescriptions("ignore.roleIn.option.role")
						.setDescriptionLocalizations(cmdLn("ignore.roleIn.option.role"))
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setNames("common.channel".toLowerCase())
						.setDescriptions("ignore.roleIn.option.chan")
						.setRequired(false)
						.addChannelTypes(
							ChannelType.GuildCategory,
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildForum
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.list").setDescriptions("ignore.list.description")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const ul = getUl(interaction);

		/**
		 * Verify if the "follow-only" mode is enabled ; return error if it is
		 */
		switch (commands) {
			case t("common.channel").toLowerCase():
				if (getConfig(CommandName.followOnlyChannel, guild.id)) {
					await interaction.reply({
						content: ul("ignore.followError") as string,
					});
					return;
				}
				await ignoreText(interaction, ul);
				break;
			case t("common.role").toLowerCase():
				if (getConfig(CommandName.followOnlyRole, guild.id)) {
					await interaction.reply({
						content: ul("ignore.followError") as string,
					});
					return;
				}
				await ignoreThisRole(interaction, ul);
				break;
			case t("common.roleIn"):
				await interactionRoleInChannel(interaction, "ignore");
				break;
			case "list":
				await listIgnored(interaction, ul);
				break;
			default:
				await listIgnored(interaction, ul);
				break;
		}
	},
};

/**
 * Display all ignored channels, roles and categories, but also the channels ignored by roles
 * @param interaction {@link CommandInteraction} the interaction to reply to
 * @param ul
 */
async function listIgnored(interaction: ChatInputCommandInteraction, ul: Translation) {
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
		.setTitle(ul("ignore.list.title"))
		.addFields({
			name: ul("common.category"),
			value: ignoredCategoriesNames || ul("ignore.list.none"),
		})
		.addFields({
			name: ul("common.channel"),
			value: ignoredThreadsNames || ul("ignore.list.none"),
		})
		.addFields({
			name: ul("common.channel"),
			value: ignoredChannelsNames || ul("ignore.list.none"),
		})
		.addFields({
			name: ul("common.forum"),
			value: ignoredForumNames || ul("ignore.list.none"),
		})
		.addFields({
			name: toTitle(ul("common.role")),
			value: ignoredRolesNames || ul("ignore.list.none"),
		});

	if (roleIn.length > 0) {
		const embed2 = new EmbedBuilder()
			.setTitle(ul("ignore.roleIn.title"))
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
 * @param ul
 */
async function ignoreThisRole(interaction: ChatInputCommandInteraction, ul: Translation) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const role = interaction.options.get(t("common.role").toLowerCase());
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: ul("ignore.role.error", { role: role?.name }) as string,
		});
		return;
	}
	const mention = role?.role.id ? roleMention(role.role.id) : role.role?.name;
	const allIgnoreRoles: Role[] = getRole("ignore", guild);
	const isAlreadyIgnored = allIgnoreRoles.some(
		(ignoredRole: Role) => ignoredRole.id === role.role?.id
	);

	if (isAlreadyIgnored) {
		//remove from ignore list
		const newIgnoreRoles: Role[] = allIgnoreRoles.filter(
			(ignoredRole: Role) => ignoredRole.id !== role.role?.id
		);
		setRole("ignore", guild, newIgnoreRoles);
		await interaction.reply({
			content: ul("ignore.role.removed", { role: mention }) as string,
		});
	} else {
		//add to ignore list
		allIgnoreRoles.push(role.role);
		setRole("ignore", guild, allIgnoreRoles);
		await interaction.reply({
			content: ul("ignore.role.added", { role: mention }) as string,
		});
	}
}

/**
 * Ignore a channel, a category or a thread
 * Run the commands based on the type of the channel
 * @param interaction {@link CommandInteraction} the interaction to reply to
 * Also contains the channel to ignore
 * @param ul
 */
async function ignoreText(interaction: ChatInputCommandInteraction, ul: Translation) {
	const toIgnore =
		interaction.options.get(t("common.channel").toLowerCase()) ?? interaction;
	if (toIgnore.channel instanceof CategoryChannel) {
		await ignoreThis(interaction, TypeName.category, ul, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ThreadChannel) {
		await ignoreThis(interaction, TypeName.thread, ul, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof TextChannel) {
		await ignoreThis(interaction, TypeName.channel, ul, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ForumChannel) {
		await ignoreThis(interaction, TypeName.forum, ul, toIgnore.channel);
	} else {
		await interaction.reply({
			content: ul("ignore.error") as string,
		});
		return;
	}
}

/**
 * Ignore specified a channel, a category or a thread.
 * Get maps based on the type of the channel
 * @param interaction {@link CommandInteraction} the interaction to reply to
 * @param typeName {@link TypeName} the type of the channel
 * @param ul
 * @param ignoreCategory {@link CategoryChannel} the category to ignore
 */
async function ignoreThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	ul: Translation,
	ignoreCategory?: CategoryChannel | ThreadChannel | TextChannel | ForumChannel
) {
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	if (!ignoreCategory) {
		await interaction.reply({
			content: ul("commands.error") as string,
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
				(getMaps("ignore", TypeName.category, guild) as CategoryChannel[]) ?? [];
			break;
		case TypeName.thread:
			allIgnored = (getMaps("ignore", TypeName.thread, guild) as ThreadChannel[]) ?? [];
			break;
		case TypeName.channel:
			allIgnored = (getMaps("ignore", TypeName.channel, guild) as TextChannel[]) ?? [];
			break;
	}
	const isAlreadyIgnored = allIgnored.some(
		(
			ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel | Role
		) => ignoredCategory.id === ignoreCategory?.id
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
					| Role
			) => ignoredCategory.id !== ignoreCategory?.id
		);
		setIgnore(
			typeName,
			guild,
			newIgnoredCategories as
				| ThreadChannel[]
				| CategoryChannel[]
				| TextChannel[]
				| ForumChannel[]
		);
		await interaction.reply({
			content: ul("ignore.thread.remove", { thread: mention }) as string,
		});
	} else {
		//add to ignore list
		allIgnored.push(ignoreCategory);
		setIgnore(
			typeName,
			guild,
			allIgnored as ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[]
		);
		await interaction.reply({
			content: ul("ignore.thread.success", {
				thread: mention,
			}) as string,
		});
	}
}
