import {
	type AnyThreadChannel,
	type ButtonInteraction,
	type CategoryChannel,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	type ForumChannel,
	type Message,
	MessageFlags,
	type ModalSubmitInteraction,
	PermissionFlagsBits,
	type Role,
	SlashCommandBuilder,
	type TextChannel,
} from "discord.js";
import type { ChannelType_ } from "src/interface";
import { cmdLn, getUl, t } from "../i18n";
import { CommandName, type Translation, TypeName } from "../interface";
import { getConfig, getRole, getRoleIn } from "../maps";
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
	data: new SlashCommandBuilder()
		.setName("ignore")
		.setDescriptions("ignore.description")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.channel")
				.setDescriptions("ignore.thread.description")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("ignore.select.type")
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
			case t("common.channel").toLowerCase(): {
				const channelType = options.getString("type") as ChannelType_;
				await channelSelectorsForType(interaction, ul, channelType);
				break;
			}
			case t("common.role"):
				if (getConfig(CommandName.followOnlyRole, guildID)) {
					await interaction.reply({
						content: ul("ignore.error.followRole", {
							id: await getCommandId("follow", interaction.guild),
						}),
					});
					return;
				}
				await ignoreThisRole(interaction, ul);
				break;
			case t("common.roleIn"):
				if (followOnlyRoleIn) {
					await interaction.reply({
						content: ul("ignore.error.followRoleIn", {
							id: await getCommandId("follow", interaction.guild),
						}),
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
	const ignoredRoleIds = getRole("ignore", guildID) ?? [];
	// Résoudre les IDs en objets Role depuis le cache
	const ignoredRoles = ignoredRoleIds
		.map((id) => interaction.guild!.roles.cache.get(id))
		.filter((r): r is Role => r !== undefined);
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
 * Ignore / un-ignore channels via paginated modal selectors by type
 */
async function channelSelectorsForType(
	interaction: ChatInputCommandInteraction,
	ul: Translation,
	channelType: ChannelType_
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;
	const ignoredItems = getTrackedItems("ignore", guildID);

	// Récupérer les items du type demandé
	let trackedIds: string[] = [];
	switch (channelType) {
		case "channel":
			trackedIds = ignoredItems.channels;
			break;
		case "thread":
			trackedIds = ignoredItems.threads;
			break;
		case "category":
			trackedIds = ignoredItems.categories;
			break;
		case "forum":
			trackedIds = ignoredItems.forums;
			break;
	}

	// Découper les trackedIds en pages (25 par page)
	const paginatedItems: Record<number, string[]> = {};
	for (let i = 0; i < Math.ceil(trackedIds.length / 25); i++) {
		const startIndex = i * 25;
		const endIndex = startIndex + 25;
		paginatedItems[i] = trackedIds.slice(startIndex, endIndex);
	}

	// Initialiser l'état de pagination avec les éléments paginés
	const stateKey = `${userId}_${guildID}_ignore_${channelType}`;
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
		const hasMore = Object.keys(paginatedItems).length > 1;

		const buttons = createPaginationButtons("ignore", 0, hasMore, ul);
		const s = ul("common.space");
		const summary = `Page 1 - ${ul(`common.${channelType}`)}${s}: ${trackedOnFirstPage} ${ul("common.elements")}`;

		await interaction.reply({
			components: buttons,
			content: summary,
			flags: MessageFlags.Ephemeral,
		});

		const buttonMessage = await interaction.fetchReply();

		// Créer un collector pour les boutons
		const collector = buttonMessage.createMessageComponentCollector({
			filter: (i) => i.user.id === userId,
			time: 600_000,
		});

		collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
			const customId = buttonInteraction.customId;

			if (customId.startsWith("ignore_page_modify_")) {
				const page = Number.parseInt(customId.split("_").pop() || "0", 10);
				await handleIgnoreModalModify(
					buttonInteraction,
					guild,
					userId,
					guildID,
					page,
					ul,
					channelType,
					state,
					stateKey,
					buttonMessage
				);
			} else if (customId.startsWith("ignore_page_prev_")) {
				await buttonInteraction.deferUpdate();
				const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
				const prevPage = Math.max(0, currentPage - 1);
				await showPaginatedMessageForIgnoreType(
					buttonInteraction,
					guild,
					userId,
					guildID,
					prevPage,
					ul,
					channelType,
					state,
					stateKey,
					buttonMessage
				);
			} else if (customId.startsWith("ignore_page_next_")) {
				await buttonInteraction.deferUpdate();
				const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
				const nextPage = currentPage + 1;
				await showPaginatedMessageForIgnoreType(
					buttonInteraction,
					guild,
					userId,
					guildID,
					nextPage,
					ul,
					channelType,
					state,
					stateKey,
					buttonMessage
				);
			} else if (customId === "ignore_page_validate") {
				await buttonInteraction.deferUpdate();
				await validateAndSaveForIgnoreType(
					buttonInteraction,
					userId,
					guildID,
					channelType,
					state.originalIds,
					ul
				);
				collector.stop();
			} else if (customId === "ignore_page_cancel") {
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
		"ignore",
		ul,
		guild,
		0,
		channelType,
		paginatedItems[0] ?? [],
		undefined,
		true
	);

	if (pageItemIds.length === 0) {
		await interaction.reply({
			content: ul("common.noMore"),
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

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
		await validateAndSaveForIgnoreType(
			modalSubmit,
			userId,
			guildID,
			channelType,
			state.originalIds,
			ul
		);
	} catch (e) {
		console.error(e);
	}
}

// State management pour pagination par type
const paginationStates = new Map<
	string,
	{ currentPage: number; selectedIds: Set<string> }
>();

/**
 * Handle modal modification for a specific page (ignore)
 */
async function handleIgnoreModalModify(
	interaction: ButtonInteraction,
	guild: NonNullable<ChatInputCommandInteraction["guild"]>,
	userId: string,
	guildID: string,
	page: number,
	ul: Translation,
	channelType: ChannelType_,
	state: {
		currentPage: number;
		paginatedItems: Record<number, string[]>;
		selectedIds: Set<string>;
	},
	stateKey: string,
	buttonMessage: Message<boolean>
) {
	if (!guild) return;

	// Récupérer les items tracked de cette page
	const pageTrackedIds = state.paginatedItems[page] ?? [];

	// Le modal affiche les items tracked de cette page
	const { modal, pageItemIds } = await createPaginatedChannelModalByType(
		"ignore",
		ul,
		guild,
		0, // Toujours page 0 car on passe déjà les items filtrés
		channelType,
		pageTrackedIds,
		undefined,
		true // Afficher les items de cette page uniquement
	);

	// Si la page est vide, retourner à la page précédente
	if (pageItemIds.length === 0) {
		await interaction.reply({
			content: ul("common.noMore"),
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

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
		const buttons = createPaginationButtons("ignore", page, hasMore, ul);
		const s = ul("common.space");
		const summary = `Page ${page + 1} - ${ul(`common.${channelType}`)}${s}: ${pageItemsCount} ${ul("common.elements")}`;

		await modalSubmit.editReply({
			components: buttons,
			content: summary,
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Show paginated message for channel selection by type (ignore)
 */
async function showPaginatedMessageForIgnoreType(
	interaction: ButtonInteraction,
	guild: NonNullable<ChatInputCommandInteraction["guild"]>,
	userId: string,
	guildID: string,
	page: number,
	ul: Translation,
	channelType: ChannelType_,
	state: {
		currentPage: number;
		paginatedItems: Record<number, string[]>;
		selectedIds: Set<string>;
	},
	stateKey: string,
	buttonMessage: Message<boolean>
) {
	if (!guild) return;

	state.currentPage = page;

	// Afficher le nombre d'éléments ignorés sur cette page
	const trackedOnThisPage = state.paginatedItems[page]?.length ?? 0;
	const hasMore = Object.keys(state.paginatedItems).length > page + 1;

	const buttons = createPaginationButtons("ignore", page, hasMore, ul);
	const s = ul("common.space");
	const summary = `Page ${page + 1} - ${ul(`common.${channelType}`)}${s}: ${trackedOnThisPage} ${ul("common.elements")}`;

	await interaction.update({
		components: buttons,
		content: summary,
	});
}

/**
 * Validate and save selections by type (ignore)
 */
async function validateAndSaveForIgnoreType(
	interaction: ButtonInteraction | ModalSubmitInteraction,
	userId: string,
	guildID: string,
	channelType: ChannelType_,
	trackedIds: string[],
	ul: Translation
) {
	const stateKey = `${userId}_${guildID}_ignore_${channelType}`;
	const state = paginationStates.get(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const finalIds = Array.from(state.selectedIds);
	const messages: string[] = [];

	// Mapper le type de channel au TypeName
	let typeName: TypeName;
	let channelTypeFilter: ChannelType[];

	switch (channelType) {
		case "channel":
			typeName = TypeName.channel;
			channelTypeFilter = [ChannelType.GuildText];
			break;
		case "thread":
			typeName = TypeName.thread;
			channelTypeFilter = [ChannelType.PublicThread, ChannelType.PrivateThread];
			break;
		case "category":
			typeName = TypeName.category;
			channelTypeFilter = [ChannelType.GuildCategory];
			break;
		case "forum":
			typeName = TypeName.forum;
			channelTypeFilter = [ChannelType.GuildForum];
			break;
	}

	// Résoudre les IDs en objets Channel
	const finalChannelsResolved = await import("../utils/index.js").then(
		({ resolveChannelsByIds }) =>
			resolveChannelsByIds<
				CategoryChannel | TextChannel | AnyThreadChannel | ForumChannel
			>(guild, finalIds, channelTypeFilter)
	);

	const originalChannelsResolved = await import("../utils/index.js").then(
		({ resolveChannelsByIds }) =>
			resolveChannelsByIds<
				CategoryChannel | TextChannel | AnyThreadChannel | ForumChannel
			>(guild, trackedIds, channelTypeFilter)
	);

	processChannelTypeChanges(
		originalChannelsResolved,
		finalChannelsResolved,
		typeName,
		guildID,
		"ignore",
		ul,
		messages
	);

	const finalMessage =
		messages.length > 0
			? ul("follow.thread.summary", { changes: `\n${messages.join("\n")}` })
			: ul("follow.thread.noChanges");

	// Handle both ButtonInteraction and ModalSubmitInteraction
	if (interaction.isModalSubmit()) {
		// For ModalSubmitInteraction, use reply
		await interaction.reply({
			components: [],
			content: finalMessage,
			flags: MessageFlags.Ephemeral,
		});
	} else if (interaction.deferred) {
		// For deferred ButtonInteraction, use editReply
		await interaction.editReply({
			components: [],
			content: finalMessage,
		});
	} else {
		// For non-deferred ButtonInteraction, use update
		await interaction.update({
			components: [],
			content: finalMessage,
		});
	}

	paginationStates.delete(stateKey);
}
