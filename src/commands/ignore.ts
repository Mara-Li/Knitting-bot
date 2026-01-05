import {
	ActionRowBuilder,
	type AnyThreadChannel,
	ButtonBuilder,
	type ButtonInteraction,
	type CategoryChannel,
	ChannelType,
	type ChatInputCommandInteraction,
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
import { getConfig, getRole, getRoleIn } from "../maps";
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
		.setName("ignore")
		.setDescriptions("ignore.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.channel").setDescriptions("ignore.thread.description")
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.role").setDescriptions("ignore.role.description")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.roleIn")
				.setDescriptions("ignore.roleIn.description")
				.addRoleOption((option) =>
					option
						.setNames("common.role")
						.setDescription("ignore.role.option")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.list").setDescriptions("ignore.list.description")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guildID = interaction.guild.id;
		const options = interaction.options as CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const ul = getUl(interaction);
		const followOnlyRoleIn = getConfig(CommandName.followOnlyRoleIn, guildID) as boolean;

		/**
		 * Verify if the "follow-only" mode is enabled ; return error if it is
		 */
		switch (commands) {
			case t("common.channel").toLowerCase():
				if (getConfig(CommandName.followOnlyChannel, guildID)) {
					await interaction.reply({
						content: ul("ignore.followError") as string,
					});
					return;
				}
				await channelSelectors(interaction, ul);
				break;
			case t("common.role").toLowerCase():
				if (getConfig(CommandName.followOnlyRole, guildID)) {
					await interaction.reply({
						content: ul("ignore.followError") as string,
					});
					return;
				}
				await ignoreThisRole(interaction, ul);
				break;
			case t("common.roleIn"):
				if (followOnlyRoleIn) {
					await interaction.reply({
						content: ul("ignore.followError") as string,
					});
					return;
				}
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
 * Ignore / un-ignore roles via modal
 */
async function ignoreThisRole(interaction: ChatInputCommandInteraction, ul: Translation) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const ignoredRoles = (getRole("ignore", guildID) as Role[]) ?? [];
	const modal = createRoleSelectModal("ignore", ul, ignoredRoles);

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
			"ignore",
			ignoredRoles,
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

/**
 * Ignore / un-ignore channels via paginated modal selectors
 */
async function channelSelectors(
	interaction: ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;
	const ignoredItems = getTrackedItems("ignore", guildID);

	// Initialiser l'état de pagination avec les éléments actuellement ignorés
	const state = initializePaginationState(userId, guildID, "ignore", ignoredItems);

	// Créer le message initial avec bouton
	const startButton = new ButtonBuilder()
		.setCustomId("ignore_channels_start")
		.setLabel(ul("ignore.thread.startButton"))
		.setEmoji("🎯")
		.setStyle(2); // Secondary

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);

	await interaction.reply({
		components: [row],
		content: ul("ignore.thread.description"),
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

		if (customId === "ignore_channels_start") {
			// Afficher la première page
			await showPaginatedModal(buttonInteraction, guild, userId, guildID, 0, ul);
		} else if (customId.startsWith("ignore_page_prev_")) {
			const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
			const prevPage = Math.max(0, currentPage - 1);
			await showPaginatedModal(buttonInteraction, guild, userId, guildID, prevPage, ul);
		} else if (customId.startsWith("ignore_page_next_")) {
			const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
			const nextPage = currentPage + 1;
			await showPaginatedModal(buttonInteraction, guild, userId, guildID, nextPage, ul);
		} else if (customId === "ignore_page_validate") {
			// Valider et sauvegarder
			await validateAndSave(buttonInteraction, userId, guildID, ignoredItems, ul);
			collector.stop();
		} else if (customId === "ignore_page_cancel") {
			// Annuler
			clearPaginationState(userId, guildID, "ignore");
			await buttonInteraction.update({
				components: [],
				content: ul("common.cancelled"),
			});
			collector.stop();
		}
	});

	collector.on("end", () => {
		clearPaginationState(userId, guildID, "ignore");
	});
}

/**
 * Show paginated modal for channel selection
 */
async function showPaginatedModal(
	interaction: ButtonInteraction,
	guild: NonNullable<ChatInputCommandInteraction["guild"]>,
	userId: string,
	guildID: string,
	page: number,
	ul: Translation
) {
	if (!guild) return;

	const state = getPaginationState(userId, guildID, "ignore");
	state.currentPage = page;

	const selectedIds = {
		categories: state.selectedCategories,
		channels: state.selectedChannels,
		forums: state.selectedForums,
		threads: state.selectedThreads,
	};

	const { modal, hasMore } = createPaginatedChannelModal(
		"ignore",
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

		// Synchroniser les sélections : ajouter les nouvelles, garder les anciennes sauf celles désélectionnées
		// Pour chaque type, on doit savoir quels items étaient disponibles sur cette page
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

		// Supprimer de l'état les items de cette page qui n'ont pas été sélectionnés
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
		const buttons = createPaginationButtons("ignore", page, hasMore, ul);
		const s = ul("common.space");
		const summary =
			`${ul("common.page")} ${page + 1} - ${ul("common.selection")}${s}:\n` +
			`📁 ${ul("common.category")}${s}: ${state.selectedCategories.size}\n` +
			`💬 ${ul("common.channel")}${s}: ${state.selectedChannels.size}\n` +
			`🧵 ${ul("common.thread")}${s}: ${state.selectedThreads.size}\n` +
			`📋 ${ul("common.forum")}${s}: ${state.selectedForums.size}`;

		await modalSubmit.reply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Validate and save all selections
 */
async function validateAndSave(
	interaction: ButtonInteraction,
	userId: string,
	guildID: string,
	originalItems: ReturnType<typeof getTrackedItems>,
	ul: Translation
) {
	const state = getPaginationState(userId, guildID, "ignore");

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
		"ignore",
		ul,
		messages
	);

	processChannelTypeChanges(
		originalItems.channels,
		finalChannels,
		TypeName.channel,
		guildID,
		"ignore",
		ul,
		messages
	);

	processChannelTypeChanges(
		originalItems.threads,
		finalThreads,
		TypeName.thread,
		guildID,
		"ignore",
		ul,
		messages
	);

	processChannelTypeChanges(
		originalItems.forums,
		finalForums,
		TypeName.forum,
		guildID,
		"ignore",
		ul,
		messages
	);

	const finalMessage =
		messages.length > 0
			? ul("follow.thread.summary", { changes: `\n${messages.join("\n")}` })
			: ul("follow.thread.noChanges");

	await interaction.update({
		components: [],
		content: finalMessage,
	});

	clearPaginationState(userId, guildID, "ignore");
}
