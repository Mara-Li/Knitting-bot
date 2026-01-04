import {
	ActionRowBuilder,
	type AnyThreadChannel,
	ButtonBuilder,
	type ButtonInteraction,
	type CategoryChannel,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	type ForumChannel,
	MessageFlags,
	type ModalSubmitInteraction,
	PermissionFlagsBits,
	type Role,
	SlashCommandBuilder,
	type TextChannel,
} from "discord.js";
import { getUl, t } from "../i18n";
import { CommandName, type Translation, TypeName } from "../interface";
import { getConfig, getRole } from "../maps";
import { toTitle } from "../utils";
import { getTrackedItems } from "../utils/itemsManager";
import {
	createPaginatedChannelModal,
	createPaginationButtons,
	createRoleSelectModal,
	processChannelTypeChanges,
	processRoleTypeChanges,
} from "../utils/modalHandler";
import {
	clearPaginationState,
	getPaginationState,
	initializePaginationState,
} from "../utils/paginationState";
import { mapToStr } from "./index";
import { interactionRoleInChannel } from "./utils";
import "../discord_ext.js";
import "uniformize";

export default {
	data: new SlashCommandBuilder()
		.setName("follow")
		.setDescriptions("follow.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.channel").setDescriptions("follow.thread.description")
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames(t("common.role")).setDescriptions("follow.role.description")
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
 */
async function followThisRole(interaction: ChatInputCommandInteraction, ul: Translation) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const followedRoles = (getRole("follow", guildID) as Role[]) ?? [];
	const modal = createRoleSelectModal("follow", ul, followedRoles);

	const collectorFilter = (i: ModalSubmitInteraction) => {
		return i.user.id === interaction.user.id;
	};

	try {
		await interaction.showModal(modal);

		const selection = await interaction.awaitModalSubmit({
			filter: collectorFilter,
			time: 60_000,
		});

		const newRoles = selection.fields.getSelectedRoles("select_roles", false);
		const messages: string[] = [];

		processRoleTypeChanges(
			guildID,
			"follow",
			followedRoles,
			Array.from((newRoles ?? new Map()).values()) as Role[],
			ul,
			messages
		);

		const finalMessage =
			messages.length > 0
				? `- ${messages.join("\n- ")}`
				: ul("follow.thread.noSelection");

		await selection.reply({
			content: finalMessage,
			flags: MessageFlags.Ephemeral,
		});
	} catch (e) {
		console.error(e);
		try {
			await interaction.reply({
				content: "error.failedReply",
				flags: MessageFlags.Ephemeral,
			});
		} catch {
			// Interaction already acknowledged, ignore
		}
		return;
	}
}

async function channelSelectors(
	interaction: ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;
	const followedItems = getTrackedItems("follow", guildID);

	// Initialiser l'état de pagination avec les éléments actuellement suivis
	const state = initializePaginationState(userId, guildID, "follow", followedItems);

	// Créer le message initial avec bouton
	const startButton = new ButtonBuilder()
		.setCustomId("follow_channels_start")
		.setLabel("🎯 Gérer les channels suivis")
		.setStyle(2); // Secondary

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);

	await interaction.reply({
		components: [row],
		content: ul("follow.thread.description"),
		flags: MessageFlags.Ephemeral,
	});

	// Collecter les interactions de boutons et modals
	const collector = interaction.channel?.createMessageComponentCollector({
		filter: (i) => i.user.id === userId,
		time: 600_000, // 10 minutes
	});

	if (!collector) return;

	collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
		const customId = buttonInteraction.customId;

		if (customId === "follow_channels_start") {
			// Afficher la première page
			await showPaginatedModalForFollow(buttonInteraction, guild, userId, guildID, 0, ul);
		} else if (customId.startsWith("follow_page_prev_")) {
			const currentPage = Number.parseInt(customId.split("_").pop() || "0");
			const prevPage = Math.max(0, currentPage - 1);
			await showPaginatedModalForFollow(
				buttonInteraction,
				guild,
				userId,
				guildID,
				prevPage,
				ul
			);
		} else if (customId.startsWith("follow_page_next_")) {
			const currentPage = Number.parseInt(customId.split("_").pop() || "0");
			const nextPage = currentPage + 1;
			await showPaginatedModalForFollow(
				buttonInteraction,
				guild,
				userId,
				guildID,
				nextPage,
				ul
			);
		} else if (customId === "follow_page_validate") {
			// Valider et sauvegarder
			await validateAndSaveForFollow(
				buttonInteraction,
				userId,
				guildID,
				followedItems,
				ul
			);
			collector.stop();
		} else if (customId === "follow_page_cancel") {
			// Annuler
			clearPaginationState(userId, guildID, "follow");
			await buttonInteraction.update({
				components: [],
				content: "❌ Annulé",
			});
			collector.stop();
		}
	});

	collector.on("end", () => {
		clearPaginationState(userId, guildID, "follow");
	});
}

/**
 * Show paginated modal for channel selection (follow)
 */
async function showPaginatedModalForFollow(
	interaction: ButtonInteraction,
	guild: NonNullable<ChatInputCommandInteraction["guild"]>,
	userId: string,
	guildID: string,
	page: number,
	ul: Translation
) {
	if (!guild) return;

	const state = getPaginationState(userId, guildID, "follow");
	state.currentPage = page;

	const selectedIds = {
		categories: state.selectedCategories,
		channels: state.selectedChannels,
		forums: state.selectedForums,
		threads: state.selectedThreads,
	};

	const { modal, hasMore } = createPaginatedChannelModal(
		"follow",
		ul,
		guild,
		page,
		selectedIds
	);

	try {
		await interaction.showModal(modal);

		// Attendre la soumission du modal
		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === userId,
			time: 60_000,
		});

		// Récupérer les nouvelles sélections
		const newCategories =
			modalSubmit.fields.getSelectedChannels("select_categories", false, [
				ChannelType.GuildCategory,
			]) ?? new Map();
		const newChannels =
			modalSubmit.fields.getSelectedChannels("select_channels", false, [
				ChannelType.GuildText,
			]) ?? new Map();
		const newThreads =
			modalSubmit.fields.getSelectedChannels("select_threads", false, [
				ChannelType.PublicThread,
				ChannelType.PrivateThread,
			]) ?? new Map();
		const newForums =
			modalSubmit.fields.getSelectedChannels("select_forums", false, [
				ChannelType.GuildForum,
			]) ?? new Map();

		// Mettre à jour l'état avec les sélections de cette page
		const newSelectedIds = {
			categories: Array.from(newCategories.keys()),
			channels: Array.from(newChannels.keys()),
			forums: Array.from(newForums.keys()),
			threads: Array.from(newThreads.keys()),
		};

		// Synchroniser les sélections
		const availableOnPage = {
			categories: Array.from(
				guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).values()
			)
				.slice(page * 25, (page + 1) * 25)
				.map((c) => c.id),
			channels: Array.from(
				guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).values()
			)
				.slice(page * 25, (page + 1) * 25)
				.map((c) => c.id),
			forums: Array.from(
				guild.channels.cache.filter((c) => c.type === ChannelType.GuildForum).values()
			)
				.slice(page * 25, (page + 1) * 25)
				.map((c) => c.id),
			threads: Array.from(
				guild.channels.cache
					.filter(
						(c) =>
							c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread
					)
					.values()
			)
				.slice(page * 25, (page + 1) * 25)
				.map((c) => c.id),
		};

		// Supprimer les désélections
		for (const id of availableOnPage.categories) {
			if (!newSelectedIds.categories.includes(id)) {
				state.selectedCategories.delete(id);
			}
		}
		for (const id of availableOnPage.channels) {
			if (!newSelectedIds.channels.includes(id)) {
				state.selectedChannels.delete(id);
			}
		}
		for (const id of availableOnPage.threads) {
			if (!newSelectedIds.threads.includes(id)) {
				state.selectedThreads.delete(id);
			}
		}
		for (const id of availableOnPage.forums) {
			if (!newSelectedIds.forums.includes(id)) {
				state.selectedForums.delete(id);
			}
		}

		// Ajouter les nouveaux
		for (const id of newSelectedIds.categories) {
			state.selectedCategories.add(id);
		}
		for (const id of newSelectedIds.channels) {
			state.selectedChannels.add(id);
		}
		for (const id of newSelectedIds.threads) {
			state.selectedThreads.add(id);
		}
		for (const id of newSelectedIds.forums) {
			state.selectedForums.add(id);
		}

		// Afficher les boutons de navigation
		const buttons = createPaginationButtons("follow", page, hasMore, ul);
		const summary =
			`Page ${page + 1} - Sélections actuelles:\n` +
			`📁 Catégories: ${state.selectedCategories.size}\n` +
			`💬 Salons: ${state.selectedChannels.size}\n` +
			`🧵 Threads: ${state.selectedThreads.size}\n` +
			`📋 Forums: ${state.selectedForums.size}`;

		await modalSubmit.reply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Validate and save all selections (follow)
 */
async function validateAndSaveForFollow(
	interaction: ButtonInteraction,
	userId: string,
	guildID: string,
	originalItems: ReturnType<typeof getTrackedItems>,
	ul: Translation
) {
	const state = getPaginationState(userId, guildID, "follow");

	// Convertir les Sets en arrays d'objets Channel
	const guild = interaction.guild;
	if (!guild) return;

	const finalCategories = Array.from(state.selectedCategories)
		.map((id) => guild.channels.cache.get(id))
		.filter((c): c is CategoryChannel => c?.type === ChannelType.GuildCategory);
	const finalChannels = Array.from(state.selectedChannels)
		.map((id) => guild.channels.cache.get(id))
		.filter((c): c is TextChannel => c?.type === ChannelType.GuildText);
	const finalThreads = Array.from(state.selectedThreads)
		.map((id) => guild.channels.cache.get(id))
		.filter(
			(c): c is AnyThreadChannel =>
				c?.type === ChannelType.PublicThread || c?.type === ChannelType.PrivateThread
		);
	const finalForums = Array.from(state.selectedForums)
		.map((id) => guild.channels.cache.get(id))
		.filter((c): c is ForumChannel => c?.type === ChannelType.GuildForum);

	const messages: string[] = [];

	// Traiter les changements pour chaque type
	processChannelTypeChanges(
		originalItems.categories,
		finalCategories,
		TypeName.category,
		guildID,
		"follow",
		ul,
		messages
	);

	processChannelTypeChanges(
		originalItems.channels,
		finalChannels,
		TypeName.channel,
		guildID,
		"follow",
		ul,
		messages
	);

	processChannelTypeChanges(
		originalItems.threads,
		finalThreads,
		TypeName.thread,
		guildID,
		"follow",
		ul,
		messages
	);

	processChannelTypeChanges(
		originalItems.forums,
		finalForums,
		TypeName.forum,
		guildID,
		"follow",
		ul,
		messages
	);

	const finalMessage =
		messages.length > 0
			? `✅ Modifications enregistrées :\n- ${messages.join("\n- ")}`
			: "Aucune modification effectuée.";

	await interaction.update({
		components: [],
		content: finalMessage,
	});

	clearPaginationState(userId, guildID, "follow");
}
