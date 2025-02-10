import {
	CategoryChannel,
	ChannelType,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	ForumChannel,
	MessageFlags,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
	roleMention,
} from "discord.js";
import { cmdLn } from "../i18n";
import { default as i18next } from "../i18n/init";
import { CommandName, TypeName } from "../interface";
import { getConfig, getMaps, getRole, setFollow, setRole } from "../maps";
import { toTitle } from "../utils";
import { mapToStr } from "./index";
import { interactionRoleInChannel } from "./utils";

const en = i18next.getFixedT("en");

export default {
	data: new SlashCommandBuilder()
		.setName("follow")
		.setDescription(en("follow.description"))
		.setDescriptionLocalizations(cmdLn("follow.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.channel").toLowerCase())
				.setNameLocalizations(cmdLn("common.channel", true))
				.setDescription(en("follow.thread.description"))
				.setDescriptionLocalizations(cmdLn("follow.thread.description"))
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations(cmdLn("common.channel", true))
						.setDescription(en("follow.thread.option.description"))
						.setDescriptionLocalizations(
							cmdLn("follow.thread.option.description"),
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
				.setDescription(en("follow.role.description"))
				.setDescriptionLocalizations(cmdLn("follow.role.description"))
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setNameLocalizations(cmdLn("common.role", true))
						.setDescription(en("follow.role.option"))
						.setDescriptionLocalizations(cmdLn("follow.role.option"))
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.list"))
				.setNameLocalizations(cmdLn("common.list"))
				.setDescription(en("follow.list.description"))
				.setDescriptionLocalizations(cmdLn("follow.list.description")),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.roleIn"))
				.setNameLocalizations(cmdLn("common.roleIn"))
				.setDescription(en("follow.roleIn.description"))
				.setDescriptionLocalizations(cmdLn("follow.roleIn.description"))
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setNameLocalizations(cmdLn("common.role", true))
						.setDescription(en("follow.roleIn.option.role"))
						.setDescriptionLocalizations(cmdLn("follow.roleIn.option.role"))
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations(cmdLn("common.channel", true))
						.setDescription(en("follow.roleIn.option.channel"))
						.setDescriptionLocalizations(cmdLn("follow.roleIn.option.channel"))
						.addChannelTypes(
							ChannelType.GuildCategory,
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread,
							ChannelType.GuildForum,
						)
						.setRequired(false),
				),
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild.id;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		switch (commands) {
			case en("common.channel").toLowerCase():
				if (!getConfig(CommandName.followOnlyChannel, guild)) {
					await interaction.reply({
						content: i18next.t("follow.disabled"),
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
				await followText(interaction);
				break;
			case en("common.role").toLowerCase():
				if (!getConfig(CommandName.followOnlyRole, guild)) {
					await interaction.reply({
						content: i18next.t("follow.disabled"),
						flags: MessageFlags.Ephemeral,
					});
					return;
				}
				await followThisRole(interaction);
				break;
			case en("common.list"):
				await displayFollowed(interaction);
				break;
			case en("common.roleIn"):
				await interactionRoleInChannel(interaction, "follow");
				break;
			default:
				await displayFollowed(interaction);
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
 */
async function displayFollowed(interaction: CommandInteraction) {
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
			.setTitle(i18next.t("follow.list.title"))
			.addFields({
				name: i18next.t("common.category"),
				value: followedCategoriesNames || i18next.t("common.none"),
			})
			.addFields({
				name: i18next.t("common.channel"),
				value: followedThreadsNames || i18next.t("common.none"),
			})
			.addFields({
				name: i18next.t("common.channel"),
				value: followedChannelsNames || i18next.t("common.none"),
			})
			.addFields({
				name: i18next.t("common.forum"),
				value: followedForumNames || i18next.t("common.none"),
			});
		if (getConfig(CommandName.followOnlyRole, guildID)) {
			embed.addFields({
				name: toTitle(i18next.t("common.role")),
				value: followedRolesNames || i18next.t("common.none"),
			});
		}
	} else if (getConfig(CommandName.followOnlyRole, guildID)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(i18next.t("follow.list.title"))
			.setDescription(followedRolesNames || i18next.t("common.none"));
	} else if (getConfig(CommandName.followOnlyRoleIn, guildID)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(i18next.t("follow.list.roleIn"))
			.setDescription(followedRolesInNames || i18next.t("common.none"));
	} else {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(i18next.t("common.disabled"));
	}

	await interaction.reply({
		embeds: [embed],
		flags: MessageFlags.Ephemeral,
	});
}

/**
 * Follow-unfollow a role
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * The role is required, linked to the option name.
 */
async function followThisRole(interaction: CommandInteraction) {
	if (!interaction.guild) return;
	const role = interaction.options.get(en("common.role").toLowerCase());
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", { role: role }),
			flags: MessageFlags.Ephemeral,
		});
		return;
	}
	const followedRoles: Role[] =
		(getRole("follow", interaction.guild.id) as Role[]) ?? [];
	const isAlreadyFollowed = followedRoles.some(
		(followedRole: Role) => followedRole.id === role.role?.id,
	);
	const mention = roleMention(role.role?.id ?? "");
	if (isAlreadyFollowed) {
		//remove from follow list
		const newFollowRoles: Role[] = followedRoles.filter(
			(followedRole: Role) => followedRole.id !== role.role?.id,
		);
		setRole("follow", interaction.guild.id, newFollowRoles);
		await interaction.reply({
			content: i18next.t("follow.role.removed", { role: mention }),
			flags: MessageFlags.Ephemeral,
		});
	} else {
		//add to follow list
		followedRoles.push(role.role);
		setRole("follow", interaction.guild.id, followedRoles);
		await interaction.reply({
			content: i18next.t("follow.role.added", { role: mention }),
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Check the type of the channel and run {@link followThis} with the right type
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 */
async function followText(interaction: CommandInteraction) {
	const toIgnore =
		interaction.options.get(en("common.channel").toLowerCase()) ?? interaction;
	if (toIgnore.channel instanceof CategoryChannel) {
		await followThis(interaction, TypeName.category, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ThreadChannel) {
		await followThis(interaction, TypeName.thread, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof TextChannel) {
		await followThis(interaction, TypeName.channel, toIgnore.channel);
	} else if (toIgnore?.channel && toIgnore.channel instanceof ForumChannel) {
		await followThis(interaction, TypeName.forum, toIgnore.channel);
	} else {
		await interaction.reply({
			content: i18next.t("ignore.error"),
			flags: MessageFlags.Ephemeral,
		});
		return;
	}
}

/**
 * Follow-unfollow a channel
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * @param typeName {@link TypeName} The type of the channel to follow.
 * @param followChan {@link CategoryChannel} | {@link ThreadChannel} | {@link TextChannel} | {@link ForumChannel} The channel to follow.
 */
async function followThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	followChan?: CategoryChannel | ThreadChannel | TextChannel | ForumChannel,
) {
	if (!followChan) {
		await interaction.reply({
			content: i18next.t("commands.error"),
			flags: MessageFlags.Ephemeral,
		});
		return;
	}
	let allFollowed: (
		| ThreadChannel
		| CategoryChannel
		| TextChannel
		| ForumChannel
	)[] = [];
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	switch (typeName) {
		case TypeName.category:
			allFollowed =
				(getMaps("follow", TypeName.category, guild) as CategoryChannel[]) ??
				[];
			break;
		case TypeName.thread:
			allFollowed =
				(getMaps("follow", TypeName.thread, guild) as ThreadChannel[]) ?? [];
			break;
		case TypeName.channel:
			allFollowed =
				(getMaps("follow", TypeName.channel, guild) as TextChannel[]) ?? [];
			break;
	}
	const isAlreadyFollowed = allFollowed.some(
		(
			ignoredCategory:
				| CategoryChannel
				| ForumChannel
				| ThreadChannel
				| TextChannel,
		) => ignoredCategory.id === followChan?.id,
	);
	if (isAlreadyFollowed) {
		const newFollowed = allFollowed.filter(
			(
				ignoredCategory:
					| CategoryChannel
					| ForumChannel
					| ThreadChannel
					| TextChannel,
			) => ignoredCategory.id !== followChan?.id,
		);
		setFollow(
			typeName,
			guild,
			newFollowed as
				| ThreadChannel[]
				| CategoryChannel[]
				| TextChannel[]
				| ForumChannel[],
		);
		await interaction.reply({
			content: i18next.t("follow.thread.remove", {
				thread: followChan.name,
			}),
			flags: MessageFlags.Ephemeral,
		});
	} else {
		//add to ignore list
		allFollowed.push(followChan);
		setFollow(
			typeName,
			guild,
			allFollowed as
				| ThreadChannel[]
				| CategoryChannel[]
				| TextChannel[]
				| ForumChannel[],
		);
		await interaction.reply({
			content: i18next.t("follow.thread.success", {
				thread: followChan.name,
			}),
			flags: MessageFlags.Ephemeral,
		});
	}
}
