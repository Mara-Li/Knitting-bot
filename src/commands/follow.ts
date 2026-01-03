import {
	type CategoryChannel,
	ChannelSelectMenuBuilder,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	type ForumChannel,
	LabelBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	PermissionFlagsBits,
	type Role,
	RoleSelectMenuBuilder,
	roleMention,
	SlashCommandBuilder,
	type TextChannel,
	type ThreadChannel,
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
			subcommand.setNames("common.channel").setDescriptions("follow.thread.description")
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
			subcommand.setNames("common.roleIn").setDescriptions("follow.roleIn.description")
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
				await channelSelectors(interaction, ul);
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
 * Follow-unfollow a role via modal
 * @param interaction {@link CommandInteraction} The interaction to reply to.
 * @param ul
 */
async function followThisRole(interaction: ChatInputCommandInteraction, ul: Translation) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const followedRoles = (getRole("follow", guildID) as Role[]) ?? [];

	const modal = new ModalBuilder()
		.setCustomId("follow_roles_modal")
		.setTitle(ul("follow.role.description"));

	const roleSelect = new RoleSelectMenuBuilder()
		.setCustomId("select_follow_roles")
		.setDefaultRoles(followedRoles.map((r) => r.id))
		.setMaxValues(25)
		.setMinValues(0);

	const roleLabel = new LabelBuilder()
		.setLabel(ul("common.role"))
		.setRoleSelectMenuComponent(roleSelect);

	modal.addLabelComponents(roleLabel);

	try {
		const collectorFilter = (i: ModalSubmitInteraction) => {
			i.deferUpdate();
			return i.user.id === interaction.user.id;
		};

		await interaction.showModal(modal);

		const selection = await interaction.awaitModalSubmit({
			filter: collectorFilter,
			time: 60_000,
		});

		const newRoles = selection.fields.getSelectedRoles("select_follow_roles", true);
		const messages: string[] = [];

		// Process roles
		await processRoleType(
			interaction,
			followedRoles,
			Array.from(newRoles.values()) as Role[],
			ul,
			messages
		);

		const finalMessage =
			messages.length > 0 ? messages.join("\n") : ul("follow.thread.noSelection");

		await interaction.editReply({
			content: finalMessage,
		});
	} catch (e) {
		await interaction.editReply({
			content: "error.failedReply",
		});
		return;
	}
}

/**
 * Get all followed channels and roles for display
 * @param guildID The guild ID
 * @returns Object containing all followed channels and roles organized by type
 */
function getFollowedItems(guildID: string) {
	const followedCategories =
		(getMaps("follow", TypeName.category, guildID) as CategoryChannel[]) ?? [];
	const followedChannels =
		(getMaps("follow", TypeName.channel, guildID) as TextChannel[]) ?? [];
	const followedThreads =
		(getMaps("follow", TypeName.thread, guildID) as ThreadChannel[]) ?? [];
	const followedForums =
		(getMaps("follow", TypeName.forum, guildID) as ForumChannel[]) ?? [];
	const followedRoles = (getRole("follow", guildID) as Role[]) ?? [];

	return {
		categories: followedCategories,
		channels: followedChannels,
		forums: followedForums,
		roles: followedRoles,
		threads: followedThreads,
	};
}

async function channelSelectors(
	interaction: ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const followedItems = getFollowedItems(guildID);

	// Create modal with 5 select menus (one for each type)
	const modal = new ModalBuilder()
		.setCustomId("follow_modal")
		.setTitle(ul("follow.thread.select.label"));

	// Categories select menu
	const categorySelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_categories")
		.setChannelTypes(ChannelType.GuildCategory)
		.setDefaultChannels(followedItems.categories.map((ch) => ch.id))
		.setMaxValues(25)
		.setMinValues(0);

	const categoryLabel = new LabelBuilder()
		.setLabel(ul("common.category"))
		.setChannelSelectMenuComponent(categorySelect);

	// Text channels select menu
	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_channels")
		.setChannelTypes(ChannelType.GuildText)
		.setDefaultChannels(followedItems.channels.map((ch) => ch.id))
		.setMaxValues(25)
		.setMinValues(0);

	const channelLabel = new LabelBuilder()
		.setLabel(ul("common.channel"))
		.setChannelSelectMenuComponent(channelSelect);

	// Threads select menu
	const threadSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_threads")
		.setChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
		.setDefaultChannels(followedItems.threads.map((ch) => ch.id))
		.setMaxValues(25)
		.setMinValues(0);

	const threadLabel = new LabelBuilder()
		.setLabel(ul("common.thread"))
		.setChannelSelectMenuComponent(threadSelect);

	// Forum select menu
	const forumSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_forums")
		.setChannelTypes(ChannelType.GuildForum)
		.setDefaultChannels(followedItems.forums.map((ch) => ch.id))
		.setMaxValues(25)
		.setMinValues(0);

	const forumLabel = new LabelBuilder()
		.setLabel(ul("common.forum"))
		.setChannelSelectMenuComponent(forumSelect);

	// Roles select menu
	const roleSelect = new RoleSelectMenuBuilder()
		.setCustomId("select_roles")
		.setDefaultRoles(followedItems.roles.map((r) => r.id))
		.setMaxValues(25)
		.setMinValues(0);

	const roleLabel = new LabelBuilder()
		.setLabel(ul("common.role"))
		.setRoleSelectMenuComponent(roleSelect);

	modal.addLabelComponents(
		categoryLabel,
		channelLabel,
		threadLabel,
		forumLabel,
		roleLabel
	);

	try {
		const collectorFilter = (i: ModalSubmitInteraction) => {
			i.deferUpdate();
			return i.user.id === interaction.user.id;
		};

		await interaction.showModal(modal);

		const selection = await interaction.awaitModalSubmit({
			filter: collectorFilter,
			time: 60_000,
		});

		const newCategories = selection.fields.getSelectedChannels(
			"select_categories",
			true,
			[ChannelType.GuildCategory]
		);
		const newChannels = selection.fields.getSelectedChannels("select_channels", true, [
			ChannelType.GuildText,
		]);
		const newThreads = selection.fields.getSelectedChannels("select_threads", true, [
			ChannelType.PublicThread,
			ChannelType.PrivateThread,
		]);
		const newForums = selection.fields.getSelectedChannels("select_forums", true, [
			ChannelType.GuildForum,
		]);
		const newRoles = selection.fields.getSelectedRoles("select_roles", true);

		const messages: string[] = [];

		// Process categories
		await processChannelType(
			interaction,
			followedItems.categories,
			Array.from(newCategories.values()) as CategoryChannel[],
			TypeName.category,
			ul,
			messages
		);

		// Process channels
		await processChannelType(
			interaction,
			followedItems.channels,
			Array.from(newChannels.values()) as TextChannel[],
			TypeName.channel,
			ul,
			messages
		);

		// Process threads
		await processChannelType(
			interaction,
			followedItems.threads,
			Array.from(newThreads.values()) as ThreadChannel[],
			TypeName.thread,
			ul,
			messages
		);

		// Process forums
		await processChannelType(
			interaction,
			followedItems.forums,
			Array.from(newForums.values()) as ForumChannel[],
			TypeName.forum,
			ul,
			messages
		);

		// Process roles
		await processRoleType(
			interaction,
			followedItems.roles,
			Array.from(newRoles.values()) as Role[],
			ul,
			messages
		);

		const finalMessage =
			messages.length > 0 ? messages.join("\n") : ul("follow.thread.noSelection");

		await interaction.editReply({
			content: finalMessage,
		});
	} catch (e) {
		await interaction.editReply({
			content: "error.failedReply",
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
 * @param isRemoving Whether this is a removal (true) or addition (false) operation
 * @returns The name of the channel that was modified, or null if operation failed
 */
async function followThis(
	interaction: CommandInteraction,
	typeName: TypeName,
	ul: Translation,
	followChan?: CategoryChannel | ThreadChannel | TextChannel | ForumChannel,
	isRemoving = false
): Promise<string | null> {
	if (!followChan) {
		if (!isRemoving) {
			await interaction.reply({
				content: ul("commands.error"),
			});
		}
		return null;
	}
	let allFollowed: (ThreadChannel | CategoryChannel | TextChannel | ForumChannel)[] = [];
	if (!interaction.guild) return null;
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
		case TypeName.forum:
			allFollowed = (getMaps("follow", TypeName.forum, guild) as ForumChannel[]) ?? [];
			break;
	}
	const isAlreadyFollowed = allFollowed.some(
		(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) =>
			ignoredCategory.id === followChan?.id
	);

	// If removing, we expect it to be followed. If adding, we expect it not to be followed.
	if (isRemoving) {
		if (isAlreadyFollowed) {
			const newFollowed = allFollowed.filter(
				(ignoredCategory: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) =>
					ignoredCategory.id !== followChan?.id
			);
			setFollow(
				typeName,
				guild,
				newFollowed as
					| ThreadChannel[]
					| CategoryChannel[]
					| TextChannel[]
					| ForumChannel[]
			);
			return followChan.name;
		}
	} else {
		if (!isAlreadyFollowed) {
			allFollowed.push(followChan);
			setFollow(
				typeName,
				guild,
				allFollowed as
					| ThreadChannel[]
					| CategoryChannel[]
					| TextChannel[]
					| ForumChannel[]
			);
			return followChan.name;
		}
	}

	return null;
}

/**
 * Process channel type changes (additions and removals)
 * @param interaction The interaction to reply to
 * @param oldItems Previously followed items of this type
 * @param newItems Currently selected items of this type
 * @param typeName The type of channels being processed
 * @param ul The translation function
 * @param messages Accumulator for response messages
 */
async function processChannelType(
	interaction: ChatInputCommandInteraction,
	oldItems: (CategoryChannel | TextChannel | ThreadChannel | ForumChannel)[],
	newItems: (CategoryChannel | TextChannel | ThreadChannel | ForumChannel)[],
	typeName: TypeName,
	ul: Translation,
	messages: string[]
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const oldIds = new Set(oldItems.map((ch) => ch.id));
	const newIds = new Set(newItems.map((ch) => ch.id));

	// Find removed items (were followed, now deselected)
	for (const oldItem of oldItems) {
		if (!newIds.has(oldItem.id)) {
			const result = await followThis(interaction, typeName, ul, oldItem, true);
			if (result) {
				messages.push(
					ul("follow.thread.remove", {
						thread: result,
					})
				);
			}
		}
	}

	// Find added items (weren't followed, now selected)
	for (const newItem of newItems) {
		if (!oldIds.has(newItem.id)) {
			const result = await followThis(interaction, typeName, ul, newItem, false);
			if (result) {
				messages.push(
					ul("follow.thread.success", {
						thread: result,
					})
				);
			}
		}
	}
}

/**
 * Process role changes (additions and removals)
 * @param interaction The interaction to reply to
 * @param oldRoles Previously followed roles
 * @param newRoles Currently selected roles
 * @param ul The translation function
 * @param messages Accumulator for response messages
 */
async function processRoleType(
	interaction: ChatInputCommandInteraction,
	oldRoles: Role[],
	newRoles: Role[],
	ul: Translation,
	messages: string[]
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const oldIds = new Set(oldRoles.map((r) => r.id));
	const newIds = new Set(newRoles.map((r) => r.id));

	// Find removed roles (were followed, now deselected)
	for (const oldRole of oldRoles) {
		if (!newIds.has(oldRole.id)) {
			const updatedRoles = oldRoles.filter((r) => r.id !== oldRole.id);
			setRole("follow", guildID, updatedRoles);
			messages.push(
				ul("follow.role.removed", {
					role: roleMention(oldRole.id),
				})
			);
		}
	}

	// Find added roles (weren't followed, now selected)
	for (const newRole of newRoles) {
		if (!oldIds.has(newRole.id)) {
			const updatedRoles = [...oldRoles, newRole];
			setRole("follow", guildID, updatedRoles);
			messages.push(
				ul("follow.role.added", {
					role: roleMention(newRole.id),
				})
			);
		}
	}
}
