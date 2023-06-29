import { channelMention, roleMention } from "@discordjs/formatters";
import {
	CategoryChannel,
	ChannelType,
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
import { CommandName, RoleIn, TypeName } from "../interface";
import { getConfig, getFollow, getRole, getRoleIn, setFollow, setRole, setRoleIn } from "../maps";
import { logInDev } from "../utils";

const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");


export default {
	data: new SlashCommandBuilder()
		.setName("follow")
		.setDescription(en("follow.description"))
		.setDescriptionLocalizations({
			fr: fr("follow.description"),
		})
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.channel").toLowerCase())
				.setNameLocalizations({
					fr: fr("common.channel").toLowerCase(),
				})
				.setDescription(en("follow.thread.description"))
				.setDescriptionLocalizations({
					fr: fr("follow.thread.description"),
				})
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.channel").toLowerCase(),
						})
						.setDescription(
							en("follow.thread.option.description")
						)
						.setDescriptionLocalizations({
							fr: fr("follow.thread.option.description"),
						})
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(en("common.role").toLowerCase())
				.setNameLocalizations({
					fr: fr("common.role").toLowerCase(),
				})
				.setDescription(en("follow.role.description"))
				.setDescriptionLocalizations({
					fr: fr("follow.role.description"),
				})
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.role").toLowerCase(),
						})
						.setDescription(en("follow.role.option"))
						.setDescriptionLocalizations({
							fr: fr("follow.role.option"),
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
				.setDescription(en("follow.list.description"))
				.setDescriptionLocalizations({
					fr: fr("follow.list.description"),
				})
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("role-in")
				.setNameLocalizations({
					fr: "role-dans",
				})
				.setDescription("Follow a role in a channel")
				.setDescriptionLocalizations({
					fr: "Suivre un rôle dans un salon",
				})
				.addRoleOption((option) =>
					option
						.setName(en("common.role").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.role").toLowerCase(),
						})
						.setDescription("The role to follow")
						.setDescriptionLocalizations({
							fr: "Le rôle à suivre",
						})
						.setRequired(true)
				)
				.addChannelOption((option) =>
					option
						.setName(en("common.channel").toLowerCase())
						.setNameLocalizations({
							fr: fr("common.channel").toLowerCase(),
						})
						.setDescription("The channel to follow")
						.setDescriptionLocalizations({
							fr: "Le salon à suivre",
						})
						.setRequired(true)
				)
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		logInDev("follow", commands);
		switch (commands) {
		case (en("common.channel").toLowerCase()):
			if (!getConfig(CommandName.followOnlyChannel)) {
				await interaction.reply({
					content: i18next.t("follow.disabled") as string,
					ephemeral: true,
				});
				return;
			}
			await followText(interaction);
			break;
		case (en("common.role").toLowerCase()):
			if (!getConfig(CommandName.followOnlyRole)) {
				await interaction.reply({
					content: i18next.t("follow.disabled") as string,
					ephemeral: true,
				});
				return;
			}
			await followThisRole(interaction);
			break;
		case en("common.list"):
			await displayFollowed(interaction);
			break;
		case "role-in":
			await followRoleInChannel(interaction);
			break;
		default:
			await displayFollowed(interaction);
			break;
			
		}
	}
};

async function displayFollowed(interaction: CommandInteraction) {
	const followedCategories = getFollow(TypeName.category) as CategoryChannel[] ?? [];
	const followedThreads = getFollow(TypeName.thread) as ThreadChannel[] ?? [];
	const followedChannels = getFollow(TypeName.channel) as TextChannel[] ?? [];
	const followedForum = getFollow(TypeName.forum) as ForumChannel[] ?? [];
	const followedRoles = getRole("follow") as Role[] ?? [];
	const followedRolesIn = getRoleIn("follow") as RoleIn[] ?? [];
	/**
	 * Display followedRoleIn :
	 * - Role:
	 * 		- Channel
	 * 		- Channel
	 * 	- Role:
	 * 		- Channel
	 * 		- Channel
	 */
	const followedRolesInNames = followedRolesIn.map((roleIn) => {
		const role = roleIn.role.id;
		const channels = roleIn.channels.map((channel) => channelMention(channel.id)).join("\n - ");
		return `\n- ${roleMention(role)}:\n - ${channels}`;
	}).join("");
	
	const followedCategoriesNames = "\n- " + followedCategories.map((category) => channelMention(category.id)).join("\n- ");
	const followedThreadsNames = "\n- " + followedThreads.map((thread) => channelMention(thread.id)).join("\n-");
	const followedChannelsNames = "\n- " + followedChannels.map((channel) => channelMention(channel.id)).join("\n-");
	const followedRolesNames = "\n- " + followedRoles.map((role) => roleMention(role.id)).join("\n-");
	const followedForumNames = "\n- " + followedForum.map((forum) => channelMention(forum.id)).join("\n-");
	let embed: EmbedBuilder;
	if (getConfig(CommandName.followOnlyChannel)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(i18next.t("follow.list.title") as string)
			.addFields({
				name: i18next.t("common.category") as string,
				value: followedCategoriesNames || i18next.t("common.none") as string,
			})
			.addFields({
				name: i18next.t("common.channel") as string,
				value: followedThreadsNames || i18next.t("common.none") as string,
			})
			.addFields({
				name: i18next.t("common.channel") as string,
				value: followedChannelsNames || i18next.t("common.none") as string,
			})
			.addFields({
				name: i18next.t("common.forum") as string,
				value: followedForumNames || i18next.t("common.none") as string,
			});
		if (getConfig(CommandName.followOnlyRole)) {
			embed.addFields({
				name: i18next.t("common.role") as string,
				value: followedRolesNames || i18next.t("common.none") as string,
			});
		}
	} else if (getConfig(CommandName.followOnlyRole)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(i18next.t("follow.list.title") as string)
			.setDescription(followedRolesNames || i18next.t("common.none") as string);
	} else if (getConfig(CommandName.followOnlyRoleIn)) {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(i18next.t("follow.list.title") as string)
			.setDescription(followedRolesInNames || i18next.t("common.none") as string);
	} else {
		embed = new EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle("Disabled");
	}

	await interaction.reply({
		embeds: [embed],
		ephemeral: true,
	});
}

async function followThisRole(interaction: CommandInteraction) {
	const role = interaction.options.get(en("common.role").toLowerCase());
	logInDev("role", role);
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", {role: role}) as string,
			ephemeral: true,
		});
		return;
	}
	const followedRoles:Role[] = getRole("follow") as Role[] ?? [];
	logInDev("allFollowRoles", followedRoles.map((role) => role.id));
	const isAlreadyFollowed = followedRoles.some(
		(followedRole: Role) => followedRole.id === role.role?.id
	);
	const mention = roleMention(role.role?.id ?? "");
	if (isAlreadyFollowed) {
		//remove from follow list
		const newFollowRoles: Role[] = followedRoles.filter(
			(followedRole: Role) => followedRole.id !== role.role?.id
		);
		setRole("follow", newFollowRoles);
		await interaction.reply({
			content: i18next.t("follow.role.removed", {role: mention}) as string,
			ephemeral: true,
		});
	} else {
		//add to follow list
		followedRoles.push(role.role);
		setRole("follow", followedRoles);
		await interaction.reply({
			content: i18next.t("follow.role.added", {role: mention}) as string,
			ephemeral: true,
		});
	}
}

async function followText(interaction: CommandInteraction) {
	const toIgnore = interaction.options.get(en("common.channel").toLowerCase()) ?? interaction;
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
			content: i18next.t("ignore.error") as string,
			ephemeral: true,
		});
		return;
	}
}

/**
 * Follow a role in a channel (text or thread) the rest of the server will be "normal", so no need to activate the follow-only mode!
 * @param interaction {CommandInteraction} The interaction that triggered the command
 */
async function followRoleInChannel(interaction: CommandInteraction) {
	if (getConfig(CommandName.followOnlyChannel) || getConfig(CommandName.followOnlyRole)) {
		await interaction.reply({
			content: "You can't use this command with the other follow-only mode.",
			ephemeral: true,
		});
		return;
	}
	if (!getConfig(CommandName.followOnlyRoleIn)) {
		await interaction.reply({
			content: "You need to activate the follow-only-role-in mode first.",
			ephemeral: true,
		});
		return;
	}
	const role = interaction.options.get(en("common.role").toLowerCase());
	const channel = interaction.options.get(en("common.channel").toLowerCase()) ?? interaction;
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", {role: role}) as string,
			ephemeral: true,
		});
		return;
	}
	const channelType = channel.channel?.type;
	logInDev("channelType", channelType as ChannelType);
	const validChannelTypes : ChannelType[] = [ChannelType.GuildCategory, ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread];
	if (!channelType || !validChannelTypes.includes(channelType as ChannelType)) {
		await interaction.reply({
			content: "This channel type is not supported",
			ephemeral: true,
		});
	}
	/**
	 * Get the RoleIn interface for the given role and channel
	 */
	const allRoleIn = getRoleIn("follow");
	//search for the role in the array
	const roleIn = allRoleIn.find(
		(roleIn: RoleIn) =>
			roleIn.role.id === role.role?.id
	);
	const ignoredRolesIn = getRoleIn("ignore");
	const ignoredRoleIn = ignoredRolesIn.find(
		(roleIn: RoleIn) => roleIn.role.id === role.role?.id
	);
	
	const mention = roleMention(role.role?.id ?? "");
	/** Verify that the role is not ignored for the same channel */
	if (ignoredRoleIn && ignoredRoleIn.channels.some(
		(followedChannel: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) => followedChannel.id === channel.channel?.id
	)) {
		await interaction.reply({
			content: "The role " + mention + " is already ignored in " + channel.channel?.toString(),
			ephemeral: true,
		});
		return;
	}
	logInDev("roleIn", roleIn);
	if (roleIn) {
		/** Verify if the channel is already in the list */
		const isAlreadyFollowed = roleIn.channels.some(
			(followedChannel: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) => followedChannel.id === channel.channel?.id
		);
		if (isAlreadyFollowed) {
			roleIn.channels = roleIn.channels.filter(
				(followedChannel: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) => followedChannel.id !== channel.channel?.id
			);
			//save
			setRoleIn("follow", allRoleIn);
			await interaction.reply({
				content: "The role " + mention + " is no longer followed in " + channel.channel?.toString(),
				ephemeral: true,
			});
			/** If the role is not followed in any channel, remove it from the list */
			if (roleIn.channels.length === 0) {
				const newFollowRoles: RoleIn[] = allRoleIn.filter(
					(followedRole: RoleIn) => followedRole.role.id !== role.role?.id
				);
				setRoleIn("follow", newFollowRoles);
			}
		} else {
			/** Add the channel to the list */
			roleIn.channels.push(channel.channel as CategoryChannel | ForumChannel | ThreadChannel | TextChannel);
			//save
			setRoleIn("follow", allRoleIn);
			await interaction.reply({
				content: "The role " + mention + " is now followed in " + channel.channel?.toString(),
				ephemeral: true,
			});
		}
		
	}
	//if not, create it
	else {
		const newRoleIn: RoleIn = {
			role: role.role,
			channels: [channel.channel as CategoryChannel | ForumChannel | ThreadChannel | TextChannel],
		};
		allRoleIn.push(newRoleIn);
		setRoleIn("follow", allRoleIn);
		await interaction.reply({
			content: "The role " + mention + " is now followed in " + channel.channel?.toString(),
			ephemeral: true,
		});
	}
}

async function followThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	followChan?: CategoryChannel
		| ThreadChannel
		| TextChannel
		| ForumChannel) {
	if (!followChan) {
		await interaction.reply({
			content: i18next.t("commands.error") as string,
			ephemeral: true,
		});
		return;
	}
	let allFollowed: (ThreadChannel | CategoryChannel | TextChannel | ForumChannel)[] = [];
	switch (typeName) {
	case TypeName.category:
		allFollowed = getFollow(TypeName.category) as CategoryChannel[] ?? [];
		break;
	case TypeName.thread:
		allFollowed = getFollow(TypeName.thread) as ThreadChannel[] ?? [];
		break;
	case TypeName.channel:
		allFollowed = getFollow(TypeName.channel) as TextChannel[] ?? [];
		break;
	}
	const isAlreadyFollowed = allFollowed.some(
		(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) => ignoredCategory.id === followChan?.id
	);
	if (isAlreadyFollowed) {
		//remove from ignore list
		const newFollowed = allFollowed.filter(
			(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) => ignoredCategory.id !== followChan?.id
		);
		setFollow(typeName, newFollowed);
		await interaction.reply({
			content: i18next.t("follow.thread.remove", {thread: followChan.name}) as string,
			ephemeral: true,
		});
	} else {
		//add to ignore list
		allFollowed.push(followChan);
		setFollow(typeName, allFollowed);
		await interaction.reply({
			content: i18next.t("follow.thread.success", {thread: followChan.name}) as string,
			ephemeral: true,
		});
	}
}

