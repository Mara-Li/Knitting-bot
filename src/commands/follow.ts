import * as Djs from "discord.js";
import type { ChannelType_ } from "src/interface";
import { cmdLn, getUl, t } from "../i18n";
import { CommandName, TIMEOUT, type Translation, TypeName } from "../interface";
import { getConfig, getRole } from "../maps";
import { getCommandId, toTitle } from "../utils";
import { getTrackedItems } from "../utils/itemsManager";
import {
	createPaginatedChannelModalByType,
	createPaginationButtons,
	createRoleSelectModal,
	processChannelTypeChanges,
	processRoleTypeChanges,
} from "../utils/modalHandler";
import { mapToStr } from "./index";
import { interactionRoleInChannel } from "./utils";
import "../discord_ext.js";
import "uniformize";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("follow")
		.setDescriptions("follow.description")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.channel")
				.setDescriptions("follow.thread.description")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("follow.select.type")
						.setChoices(
							{
								name: t("common.channel"),
								name_localizations: cmdLn("common.channel"),
								value: "channel",
							},
							{
								name: t("common.thread"),
								name_localizations: cmdLn("common.thread"),
								value: "thread",
							},
							{
								name: t("common.category"),
								name_localizations: cmdLn("common.category"),
								value: "category",
							},
							{
								name: t("common.forum"),
								name_localizations: cmdLn("common.forum"),
								value: "forum",
							}
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.role").setDescriptions("follow.role.description")
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
	async execute(interaction: Djs.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild.id;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const ul = getUl(interaction);

		switch (commands) {
			case t("common.channel").toLowerCase(): {
				const channelType = options.getString("type") as ChannelType_;
				console.log(`[follow] Received command with type: ${channelType}`);
				await channelSelectorsForType(interaction, ul, channelType);
				break;
			}
			case t("common.role").toLowerCase():
				if (!getConfig(CommandName.followOnlyRole, guild)) {
					await interaction.reply({
						content: ul("follow.error.role", {
							id: await getCommandId("ignore", interaction.guild),
						}),
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
	interaction: Djs.ChatInputCommandInteraction,
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
	let embed: Djs.EmbedBuilder;
	if (getConfig(CommandName.followOnlyChannel, guildID)) {
		embed = new Djs.EmbedBuilder()
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
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.title"))
			.setDescription(followedRolesNames || ul("common.none"));
	} else if (getConfig(CommandName.followOnlyRoleIn, guildID)) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.roleIn"))
			.setDescription(followedRolesInNames || ul("common.none"));
	} else {
		embed = new Djs.EmbedBuilder().setColor("#2f8e7d").setTitle(ul("common.disabled"));
	}

	await interaction.reply({
		embeds: [embed],
	});
}

/**
 * Follow-unfollow a role via modal
 */
async function followThisRole(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const followedRoleIds = getRole("follow", guildID) ?? [];
	// Résoudre les IDs en objets Role depuis le cache
	const followedRoles = followedRoleIds
		.map((id) => interaction.guild!.roles.cache.get(id))
		.filter((r): r is Djs.Role => r !== undefined);
	const modal = createRoleSelectModal("follow", ul, followedRoles);

	const collectorFilter = (i: Djs.ModalSubmitInteraction) => {
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
			Array.from((newRoles ?? new Map()).values()) as Djs.Role[],
			ul,
			messages
		);

		const finalMessage =
			messages.length > 0
				? `- ${messages.join("\n- ")}`
				: ul("follow.thread.noSelection");

		await selection.reply({
			content: finalMessage,
			flags: Djs.MessageFlags.Ephemeral,
		});
	} catch (e) {
		console.error(e);
		try {
			await interaction.reply({
				content: "error.failedReply",
				flags: Djs.MessageFlags.Ephemeral,
			});
		} catch {
			// Interaction already acknowledged, ignore
		}
		return;
	}
}

async function channelSelectorsForType(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	channelType: ChannelType_
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;
	const followedItems = getTrackedItems("follow", guildID);

	console.log(`[follow ${channelType}] followedItems:`, followedItems);

	// Récupérer les items du type demandé
	let trackedIds: string[] = [];
	switch (channelType) {
		case "channel":
			trackedIds = followedItems.channels;
			break;
		case "thread":
			trackedIds = followedItems.threads;
			break;
		case "category":
			trackedIds = followedItems.categories;
			break;
		case "forum":
			trackedIds = followedItems.forums;
			break;
	}

	console.log(`[follow ${channelType}] trackedIds:`, trackedIds);

	// Découper les trackedIds en pages (25 par page)
	const paginatedItems: Record<number, string[]> = {};
	for (let i = 0; i < Math.ceil(trackedIds.length / 25); i++) {
		const startIndex = i * 25;
		const endIndex = startIndex + 25;
		paginatedItems[i] = trackedIds.slice(startIndex, endIndex);
	}

	console.log(`[follow ${channelType}] paginatedItems:`, paginatedItems);

	// Initialiser l'état de pagination avec les éléments paginés
	const stateKey = `${userId}_${guildID}_follow_${channelType}`;
	const state = {
		currentPage: 0,
		originalIds: trackedIds, // Stocker les IDs originaux pour la validation
		paginatedItems,
		selectedIds: new Set(trackedIds),
	};
	paginationStates.set(stateKey, state);

	// Si 25 items ou plus, afficher un message avec boutons
	if (trackedIds.length >= 25) {
		// Nombre d'items sur la première page
		const trackedOnFirstPage = paginatedItems[0]?.length ?? 0;

		// Y a-t-il d'autres pages ?
		const hasMore = Object.keys(paginatedItems).length >= 1;

		const buttons = createPaginationButtons("follow", 0, hasMore, ul);
		const summary = `Page 1 - ${ul(`common.${channelType}`)} : ${trackedOnFirstPage} ${ul("common.elements")}`;

		await interaction.reply({
			components: buttons,
			content: summary,
			flags: Djs.MessageFlags.Ephemeral,
		});

		const buttonMessage = await interaction.fetchReply();

		// Créer un collector pour les boutons
		const collector = buttonMessage.createMessageComponentCollector({
			filter: (i) => i.user.id === userId,
			time: TIMEOUT,
		});

		collector.on("collect", async (buttonInteraction: Djs.ButtonInteraction) => {
			const customId = buttonInteraction.customId;

			if (customId.startsWith("follow_page_modify_")) {
				const page = Number.parseInt(customId.split("_").pop() || "0", 10);
				await handleFollowModalModify(
					buttonInteraction,
					guild,
					userId,
					page,
					ul,
					channelType,
					state
				);
			} else if (customId.startsWith("follow_page_prev_")) {
				await buttonInteraction.deferUpdate();
				const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
				const prevPage = Math.max(0, currentPage - 1);
				await showPaginatedMessageForFollowType(
					buttonInteraction,
					guild,
					prevPage,
					ul,
					channelType,
					state
				);
			} else if (customId.startsWith("follow_page_next_")) {
				await buttonInteraction.deferUpdate();
				const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
				const nextPage = currentPage + 1;
				await showPaginatedMessageForFollowType(
					buttonInteraction,
					guild,
					nextPage,
					ul,
					channelType,
					state
				);
			} else if (customId === "follow_page_validate") {
				await buttonInteraction.deferUpdate();
				await validateAndSaveForFollowType(
					buttonInteraction,
					userId,
					guildID,
					channelType,
					state.originalIds,
					ul
				);
				collector.stop();
			} else if (customId === "follow_page_cancel") {
				await buttonInteraction.deferUpdate();
				paginationStates.delete(stateKey);
				await buttonInteraction.update({
					components: [],
					content: ul("common.cancelled"),
				});
				collector.stop();
			}
		});

		collector.on("end", () => {
			if (paginationStates.has(stateKey)) {
				paginationStates.delete(stateKey);
			}
		});

		return;
	}

	// Créer le modal pour la page 0 (≤25 items)
	const { modal, pageItemIds } = await createPaginatedChannelModalByType(
		"follow",
		ul,
		guild,
		0,
		channelType,
		paginatedItems[0] ?? [],
		undefined,
		true
	);

	try {
		// Afficher le modal directement si ≤25 items
		await interaction.showModal(modal);

		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === userId,
			time: 60_000,
		});

		const newSelection =
			modalSubmit.fields.getSelectedChannels(`select_${channelType}`, false) ?? new Map();
		const newSelectedIds = Array.from(newSelection.keys());

		// Mettre à jour les items de la page 0
		state.paginatedItems[0] = newSelectedIds;

		// Reconstruire selectedIds
		state.selectedIds.clear();
		for (const id of newSelectedIds) {
			state.selectedIds.add(id);
		}

		// Valider directement
		await validateAndSaveForFollowType(
			modalSubmit,
			userId,
			guildID,
			channelType,
			state.originalIds,
			ul
		);
	} catch (e) {
		console.error(`[follow ${channelType}] Error:`, e);
	}
}

// State management pour pagination par type
const paginationStates = new Map<
	string,
	{ currentPage: number; selectedIds: Set<string> }
>();

/**
 * Handle modal modification for a specific page (follow)
 */
async function handleFollowModalModify(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	userId: string,
	page: number,
	ul: Translation,
	channelType: ChannelType_,
	state: {
		currentPage: number;
		paginatedItems: Record<number, string[]>;
		selectedIds: Set<string>;
	}
) {
	if (!guild) return;

	// Récupérer les items tracked de cette page
	const pageTrackedIds = state.paginatedItems[page] ?? [];

	// Le modal affiche les items tracked de cette page
	const { modal, pageItemIds } = await createPaginatedChannelModalByType(
		"follow",
		ul,
		guild,
		0, // Toujours page 0 car on passe déjà les items filtrés
		channelType,
		pageTrackedIds,
		undefined,
		true // Afficher les items de cette page uniquement
	);

	try {
		await interaction.showModal(modal);

		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.user.id === userId,
			time: 60_000,
		});

		// Defer immédiatement pour éviter l'expiration du token
		await modalSubmit.deferUpdate();

		const newSelection =
			modalSubmit.fields.getSelectedChannels(`select_${channelType}`, false) ?? new Map();
		const newSelectedIds = Array.from(newSelection.keys());

		// Mettre à jour les items de cette page
		state.paginatedItems[page] = newSelectedIds;

		// Reconstruire selectedIds à partir de toutes les pages
		state.selectedIds.clear();
		for (const pageItems of Object.values(state.paginatedItems)) {
			for (const id of pageItems) {
				state.selectedIds.add(id);
			}
		}

		// Retour au message avec boutons
		const pageItemsCount = state.paginatedItems[page]?.length ?? 0;
		const hasMore = Object.keys(state.paginatedItems).length > page + 1;
		const buttons = createPaginationButtons("follow", page, hasMore, ul);
		const summary = `Page ${page + 1} - ${ul(`common.${channelType}`)} : ${pageItemsCount} ${ul("common.elements")}`;

		await modalSubmit.editReply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Show paginated message for channel selection by type (follow)
 */
async function showPaginatedMessageForFollowType(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	page: number,
	ul: Translation,
	channelType: ChannelType_,
	state: {
		currentPage: number;
		paginatedItems: Record<number, string[]>;
		selectedIds: Set<string>;
	}
) {
	if (!guild) return;

	state.currentPage = page;

	// Afficher le nombre d'éléments suivis sur cette page
	const trackedOnThisPage = state.paginatedItems[page]?.length ?? 0;
	const hasMore = Object.keys(state.paginatedItems).length > page + 1;

	const buttons = createPaginationButtons("follow", page, hasMore, ul);
	const summary = `Page ${page + 1} - ${ul(`common.${channelType}`)} : ${trackedOnThisPage} ${ul("common.elements")}`;

	await interaction.editReply({
		components: buttons,
		content: summary,
	});
}

/**
 * Validate and save selections by type (follow)
 */
async function validateAndSaveForFollowType(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	userId: string,
	guildID: string,
	channelType: ChannelType_,
	trackedIds: string[],
	ul: Translation
) {
	const stateKey = `${userId}_${guildID}_follow_${channelType}`;
	const state = paginationStates.get(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const finalIds = Array.from(state.selectedIds);
	const messages: string[] = [];

	// Mapper le type de channel au TypeName
	let typeName: TypeName;
	let channelTypeFilter: Djs.ChannelType[];

	switch (channelType) {
		case "channel":
			typeName = TypeName.channel;
			channelTypeFilter = [Djs.ChannelType.GuildText];
			break;
		case "thread":
			typeName = TypeName.thread;
			channelTypeFilter = [Djs.ChannelType.PublicThread, Djs.ChannelType.PrivateThread];
			break;
		case "category":
			typeName = TypeName.category;
			channelTypeFilter = [Djs.ChannelType.GuildCategory];
			break;
		case "forum":
			typeName = TypeName.forum;
			channelTypeFilter = [Djs.ChannelType.GuildForum];
			break;
	}

	// Résoudre les IDs en objets Channel
	const finalChannelsResolved = await import("../utils/index.js").then(
		({ resolveChannelsByIds }) =>
			resolveChannelsByIds<
				Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
			>(guild, finalIds, channelTypeFilter)
	);

	const originalChannelsResolved = await import("../utils/index.js").then(
		({ resolveChannelsByIds }) =>
			resolveChannelsByIds<
				Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
			>(guild, trackedIds, channelTypeFilter)
	);

	processChannelTypeChanges(
		originalChannelsResolved,
		finalChannelsResolved,
		typeName,
		guildID,
		"follow",
		ul,
		messages
	);

	const finalMessage =
		messages.length > 0
			? ul("follow.thread.summary", { changes: `\n- ${messages.join("\n- ")}` })
			: ul("follow.thread.noChanges");

	// Handle both ButtonInteraction and ModalSubmitInteraction
	if (interaction.isModalSubmit()) {
		// For ModalSubmitInteraction, use reply
		await interaction.reply({
			components: [],
			content: finalMessage,
			flags: Djs.MessageFlags.Ephemeral,
		});
	} else {
		// For ButtonInteraction
		if (interaction.deferred) {
			// If already deferred, use editReply
			await interaction.editReply({
				components: [],
				content: finalMessage,
			});
		} else {
			// If not deferred, use update
			await interaction.update({
				components: [],
				content: finalMessage,
			});
		}
	}

	paginationStates.delete(stateKey);
}
