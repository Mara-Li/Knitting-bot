import * as Djs from "discord.js";
import type { ChannelType_ } from "src/interface";
import { TIMEOUT, type Translation, TypeName } from "../interface";
import { resolveChannelsByIds } from "../utils";
import type { CommandMode } from "../utils/itemsManager";
import { getTrackedItems } from "../utils/itemsManager";
import {
	createPaginatedChannelModalByType,
	createPaginationButtons,
	processChannelTypeChanges,
} from "../utils/modalHandler";

type PaginationState = {
	currentPage: number;
	originalIds: string[];
	paginatedItems: Record<number, string[]>;
	selectedIds: Set<string>;
};

// State management pour pagination par type (partagé entre follow et ignore)
const paginationStates = new Map<string, PaginationState>();

/**
 * Handle channel selectors with pagination for follow/ignore commands
 */
export async function channelSelectorsForType(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	channelType: ChannelType_,
	mode: CommandMode
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const guild = interaction.guild;
	const userId = interaction.user.id;
	const trackedItems = getTrackedItems(mode, guildID);

	console.log(`[${mode} ${channelType}] trackedItems:`, trackedItems);

	// Récupérer les items du type demandé
	let trackedIds: string[] = [];
	switch (channelType) {
		case "channel":
			trackedIds = trackedItems.channels;
			break;
		case "thread":
			trackedIds = trackedItems.threads;
			break;
		case "category":
			trackedIds = trackedItems.categories;
			break;
		case "forum":
			trackedIds = trackedItems.forums;
			break;
	}

	console.log(`[${mode} ${channelType}] trackedIds:`, trackedIds);

	// Découper les trackedIds en pages (25 par page)
	const paginatedItems: Record<number, string[]> = {};
	for (let i = 0; i < Math.ceil(trackedIds.length / 25); i++) {
		const startIndex = i * 25;
		const endIndex = startIndex + 25;
		paginatedItems[i] = trackedIds.slice(startIndex, endIndex);
	}

	console.log(`[${mode} ${channelType}] paginatedItems:`, paginatedItems);

	// Initialiser l'état de pagination avec les éléments paginés
	const stateKey = `${userId}_${guildID}_${mode}_${channelType}`;
	const state: PaginationState = {
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

		const buttons = createPaginationButtons(mode, 0, hasMore, ul);
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

			if (customId.startsWith(`${mode}_page_modify_`)) {
				const page = Number.parseInt(customId.split("_").pop() || "0", 10);
				await handleModalModify(
					buttonInteraction,
					guild,
					userId,
					page,
					ul,
					channelType,
					state,
					mode
				);
			} else if (customId.startsWith(`${mode}_page_prev_`)) {
				await buttonInteraction.deferUpdate();
				const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
				const prevPage = Math.max(0, currentPage - 1);
				await showPaginatedMessage(
					buttonInteraction,
					guild,
					prevPage,
					ul,
					channelType,
					state,
					mode
				);
			} else if (customId.startsWith(`${mode}_page_next_`)) {
				await buttonInteraction.deferUpdate();
				const currentPage = Number.parseInt(customId.split("_").pop() || "0", 10);
				const nextPage = currentPage + 1;
				await showPaginatedMessage(
					buttonInteraction,
					guild,
					nextPage,
					ul,
					channelType,
					state,
					mode
				);
			} else if (customId === `${mode}_page_validate`) {
				await buttonInteraction.deferUpdate();
				await validateAndSave(
					buttonInteraction,
					userId,
					guildID,
					channelType,
					state.originalIds,
					ul,
					mode
				);
				collector.stop();
			} else if (customId === `${mode}_page_cancel`) {
				await buttonInteraction.deferUpdate();
				paginationStates.delete(stateKey);
				await buttonInteraction.editReply({
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
	const { modal } = await createPaginatedChannelModalByType(
		mode,
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
		await validateAndSave(
			modalSubmit,
			userId,
			guildID,
			channelType,
			state.originalIds,
			ul,
			mode
		);
	} catch (e) {
		console.error(`[${mode} ${channelType}] Error:`, e);
	}
}

/**
 * Handle modal modification for a specific page
 */
async function handleModalModify(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	userId: string,
	page: number,
	ul: Translation,
	channelType: ChannelType_,
	state: PaginationState,
	mode: CommandMode
) {
	if (!guild) return;

	// Récupérer les items tracked de cette page
	const pageTrackedIds = state.paginatedItems[page] ?? [];

	// Le modal affiche les items tracked de cette page
	const { modal } = await createPaginatedChannelModalByType(
		mode,
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
		try {
			await modalSubmit.deferUpdate();
		} catch (e) {
			if (e instanceof Djs.DiscordAPIError && e.code === 10062) {
				// Token expiré, on peut pas répondre
				console.warn(`[${mode} ${channelType}] Token expiré pour ModalSubmit`, e.message);
				return;
			}
			throw e;
		}

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
		const buttons = createPaginationButtons(mode, page, hasMore, ul);
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
 * Show paginated message for channel selection by type
 */
async function showPaginatedMessage(
	interaction: Djs.ButtonInteraction,
	guild: NonNullable<Djs.ChatInputCommandInteraction["guild"]>,
	page: number,
	ul: Translation,
	channelType: ChannelType_,
	state: PaginationState,
	mode: CommandMode
) {
	if (!guild) return;

	state.currentPage = page;

	// Afficher le nombre d'éléments suivis sur cette page
	const trackedOnThisPage = state.paginatedItems[page]?.length ?? 0;
	const hasMore = Object.keys(state.paginatedItems).length > page + 1;

	const buttons = createPaginationButtons(mode, page, hasMore, ul);
	const summary = `Page ${page + 1} - ${ul(`common.${channelType}`)} : ${trackedOnThisPage} ${ul("common.elements")}`;

	await interaction.editReply({
		components: buttons,
		content: summary,
	});
}

/**
 * Validate and save selections by type
 */
async function validateAndSave(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	userId: string,
	guildID: string,
	channelType: ChannelType_,
	trackedIds: string[],
	ul: Translation,
	mode: CommandMode
) {
	const stateKey = `${userId}_${guildID}_${mode}_${channelType}`;
	const state = paginationStates.get(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const finalIds = Array.from(state.selectedIds);
	const messages: string[] = [];

	console.log(`[${mode} ${channelType}] finalIds:`, state.selectedIds);

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
	const finalChannelsResolved = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>(guild, finalIds, channelTypeFilter);

	const originalChannelsResolved = await resolveChannelsByIds<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>(guild, trackedIds, channelTypeFilter);

	processChannelTypeChanges(
		originalChannelsResolved,
		finalChannelsResolved,
		typeName,
		guildID,
		mode,
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
