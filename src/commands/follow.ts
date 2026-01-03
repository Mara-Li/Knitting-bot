import {
	CategoryChannel,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
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
import { getConfig, getMaps, getRole, setFollow, setRole } from "../maps";
import { toTitle } from "../utils";
import { mapToStr } from "./index";
import { interactionRoleInChannel } from "./utils";
import "../discord_ext";

export default {
	data: new SlashCommandBuilder()
		.setName("follow")
		.setDescriptions("follow.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.channel")
				.setDescriptions("follow.thread.description")
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("follow.thread.option.description")
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
				.setNames(t("common.role"))
				.setDescriptions("follow.role.description")
				.addRoleOption((option) =>
					option
						.setName(t("common.role").toLowerCase())
						.setNameLocalizations(cmdLn("common.role", true))
						.setDescription(t("follow.role.option"))
						.setDescriptionLocalizations(cmdLn("follow.role.option"))
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.list").setDescriptions("follow.list.description")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.roleIn")
				.setDescriptions("follow.roleIn.description")
				.addRoleOption((option) =>
					option
						.setNames("common.role")
						.setDescription("follow.roleIn.option.role")
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setNames("common.channel")
						.setDescriptions("follow.roleIn.option.channel")
						.addChannelTypes(
							ChannelType.GuildCategory,
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildForum
						)
						.setRequired(false)
				)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild.id;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const ul = getUl(interaction);

		switch (commands) {
			case t("common.channel").toLowerCase():
				if (!getConfig(CommandName.followOnlyChannel, guild)) {
					await interaction.reply({
						content: ul("follow.disabled"),
					});
					return;
				}
				await followText(interaction, ul);
				break;
			case t("common.role").toLowerCase():
				if (!getConfig(CommandName.followOnlyRole, guild)) {
					await interaction.reply({
						content: ul("follow.disabled"),
					});
					return;
				}
				await followThisRole(interaction, ul);
				break;
			case t("common.list"):
				await displayFollowed(interaction, ul);
				break;
			case t("common.roleIn"):
				await interactionRoleInChannel(interaction, "follow");
				break;
			default:
				await displayFollowed(interaction, ul);
				break;
		}
	},
};

/**
 * Display the list of the followed channels.
 * Display the embed based on the configuration:
 * - Followed categories if the CommandName.followOnlyChannel is true
 * - Followed roles if the CommandName.followOnlyRole is true
 * - Followed roles in chan
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * @param ul
 */
async function displayFollowed(
	interaction: ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;
	const guildID = interaction.guild.id;
	const followed = mapToStr("follow", guildID);
	const {
		rolesNames: followedRolesNames,
		categoriesNames: followedCategoriesNames,
		threadsNames: followedThreadsNames,
		channelsNames: followedChannelsNames,
		rolesInNames: followedRolesInNames,
		forumNames: followedForumNames,
	} = followed;
	let embed: EmbedBuilder;
	if (getConfig(CommandName.followOnlyChannel, guildID)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.title"))
			.addFields({
				name: ul("common.category"),
				value: followedCategoriesNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.channel"),
				value: followedThreadsNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.channel"),
				value: followedChannelsNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.forum"),
				value: followedForumNames || ul("common.none"),
			});
		if (getConfig(CommandName.followOnlyRole, guildID)) {
			embed.addFields({
				name: toTitle(ul("common.role")),
				value: followedRolesNames || ul("common.none"),
			});
		}
	} else if (getConfig(CommandName.followOnlyRole, guildID)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.title"))
			.setDescription(followedRolesNames || ul("common.none"));
	} else if (getConfig(CommandName.followOnlyRoleIn, guildID)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.roleIn"))
			.setDescription(followedRolesInNames || ul("common.none"));
	} else {
		embed = new EmbedBuilder().setColor("#2f8e7d").setTitle(ul("common.disabled"));
	}

	await interaction.reply({
		embeds: [embed],
	});
}

/**
 * Follow-unfollow a role
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * The role is required, linked to the option name.
 * @param ul
 */
async function followThisRole(interaction: ChatInputCommandInteraction, ul: Translation) {
	if (!interaction.guild) return;
	const role = interaction.options.get(t("common.role").toLowerCase());
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: ul("ignore.role.error", { role: role }),
		});
		return;
	}
	const followedRoles: Role[] = (getRole("follow", interaction.guild.id) as Role[]) ?? [];
	const isAlreadyFollowed = followedRoles.some(
		(followedRole: Role) => followedRole.id === role.role?.id
	);
	const mention = roleMention(role.role?.id ?? "");
	if (isAlreadyFollowed) {
		//remove from follow list
		const newFollowRoles: Role[] = followedRoles.filter(
			(followedRole: Role) => followedRole.id !== role.role?.id
		);
		setRole("follow", interaction.guild.id, newFollowRoles);
		await interaction.reply({
			content: ul("follow.role.removed", { role: mention }),
		});
	} else {
		//add to follow list
		followedRoles.push(role.role);
		setRole("follow", interaction.guild.id, followedRoles);
		await interaction.reply({
			content: ul("follow.role.added", { role: mention }),
		});
	}
}

/**
 * Check the type of the channel and run {@link followThis} with the right type
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * @param ul
 */
async function followText(interaction: ChatInputCommandInteraction, ul: Translation) {
	const toIgnore =
		interaction.options.get(t("common.channel").toLowerCase()) ?? interaction;
	if (toIgnore.channel instanceof CategoryChannel) {
		await followThis(interaction, TypeName.category, ul, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ThreadChannel) {
		await followThis(interaction, TypeName.thread, ul, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof TextChannel) {
		await followThis(interaction, TypeName.channel, ul, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ForumChannel) {
		await followThis(interaction, TypeName.forum, ul, toIgnore.channel);
	} else {
		await interaction.reply({
			content: ul("ignore.error"),
		});
		return;
	}
}

/**
 * Follow-unfollow a channel
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * @param typeName {@link TypeName} The type of the channel to follow.
 * @param ul
 * @param followChan {@link CategoryChannel} | {@link ThreadChannel} | {@link TextChannel} | {@link ForumChannel} The channel to follow.
 */
async function followThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	ul: Translation,
	followChan?: CategoryChannel | ThreadChannel | TextChannel | ForumChannel
) {
	if (!followChan) {
		await interaction.reply({
			content: ul("commands.error"),
		});
		return;
	}
	let allFollowed: (ThreadChannel | CategoryChannel | TextChannel | ForumChannel)[] = [];
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	switch (typeName) {
		case TypeName.category:
			allFollowed =
				(getMaps("follow", TypeName.category, guild) as CategoryChannel[]) ?? [];
			break;
		case TypeName.thread:
			allFollowed = (getMaps("follow", TypeName.thread, guild) as ThreadChannel[]) ?? [];
			break;
		case TypeName.channel:
			allFollowed = (getMaps("follow", TypeName.channel, guild) as TextChannel[]) ?? [];
			break;
	}
	const isAlreadyFollowed = allFollowed.some(
		(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) =>
			ignoredCategory.id === followChan?.id
	);
	if (isAlreadyFollowed) {
		const newFollowed = allFollowed.filter(
			(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) =>
				ignoredCategory.id !== followChan?.id
		);
		setFollow(
			typeName,
			guild,
			newFollowed as ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[]
		);
		await interaction.reply({
			content: ul("follow.thread.remove", {
				thread: followChan.name,
			}),
		});
	} else {
		//add to ignore list
		allFollowed.push(followChan);
		setFollow(
			typeName,
			guild,
			allFollowed as ThreadChannel[] | CategoryChannel[] | TextChannel[] | ForumChannel[]
		);
		await interaction.reply({
			content: ul("follow.thread.success", {
				thread: followChan.name,
			}),
		});
	}
}
