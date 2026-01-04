import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type CategoryChannel,
	ChannelSelectMenuBuilder,
	ChannelType,
	type ForumChannel,
	type Guild,
	LabelBuilder,
	ModalBuilder,
	type Role,
	RoleSelectMenuBuilder,
	roleMention,
	type TextChannel,
	type ThreadChannel,
} from "discord.js";
import { type Translation, TypeName } from "../interface";
import { setFollow, setIgnore, setRole } from "../maps";
import type { CommandMode, TrackedItems } from "./itemsManager";

/**
 * Create a modal with 4 channel type selectors
 */
export function createChannelSelectorsModal(
	mode: CommandMode,
	ul: Translation,
	trackedItems: TrackedItems
): ModalBuilder {
	const modal = new ModalBuilder()
		.setCustomId(`${mode}_channels_modal`)
		.setTitle(
			mode === "follow"
				? ul("follow.thread.description")
				: ul("ignore.thread.description")
		);

	// Categories select menu
	const categorySelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_categories")
		.setChannelTypes(ChannelType.GuildCategory)
		.setDefaultChannels(trackedItems.categories.map((ch) => ch.id))
		.setMaxValues(25)
		.setRequired(false);

	const categoryLabel = new LabelBuilder()
		.setLabel(ul("common.category"))
		.setChannelSelectMenuComponent(categorySelect);

	// Text channels select menu
	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_channels")
		.setChannelTypes(ChannelType.GuildText)
		.setDefaultChannels(trackedItems.channels.map((ch) => ch.id))
		.setMaxValues(25)
		.setRequired(false);

	const channelLabel = new LabelBuilder()
		.setLabel(ul("common.channel"))
		.setChannelSelectMenuComponent(channelSelect);

	// Threads select menu
	const threadSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_threads")
		.setChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
		.setDefaultChannels(trackedItems.threads.map((ch) => ch.id))
		.setMaxValues(25)
		.setRequired(false);

	const threadLabel = new LabelBuilder()
		.setLabel(ul("common.thread"))
		.setChannelSelectMenuComponent(threadSelect);

	// Forum select menu
	const forumSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_forums")
		.setChannelTypes(ChannelType.GuildForum)
		.setDefaultChannels(trackedItems.forums.map((ch) => ch.id))
		.setMaxValues(25)
		.setRequired(false);

	const forumLabel = new LabelBuilder()
		.setLabel(ul("common.forum"))
		.setChannelSelectMenuComponent(forumSelect);

	modal.addLabelComponents(categoryLabel, channelLabel, threadLabel, forumLabel);

	return modal;
}

/**
 * Get available channels for a specific page (25 per page)
 */
function paginateChannels<T extends { id: string }>(items: T[], page: number): T[] {
	const startIndex = page * 25;
	const endIndex = startIndex + 25;
	return items.slice(startIndex, endIndex);
}

/**
 * Create a paginated modal with channel selectors
 */
export function createPaginatedChannelModal(
	mode: CommandMode,
	ul: Translation,
	guild: Guild,
	page: number,
	selectedIds: {
		categories: Set<string>;
		channels: Set<string>;
		threads: Set<string>;
		forums: Set<string>;
	},
	shortTitle?: string
): { modal: ModalBuilder; hasMore: boolean } {
	// Récupérer tous les channels du serveur
	const allCategories = Array.from(
		guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).values()
	) as CategoryChannel[];
	const allChannels = Array.from(
		guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).values()
	) as TextChannel[];
	const allThreads = Array.from(
		guild.channels.cache
			.filter(
				(c) => c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread
			)
			.values()
	) as ThreadChannel[];
	const allForums = Array.from(
		guild.channels.cache.filter((c) => c.type === ChannelType.GuildForum).values()
	) as ForumChannel[];

	// Paginer chaque type
	const pageCategories = paginateChannels(allCategories, page);
	const pageChannels = paginateChannels(allChannels, page);
	const pageThreads = paginateChannels(allThreads, page);
	const pageForums = paginateChannels(allForums, page);

	// Déterminer s'il y a plus de pages
	const hasMore =
		allCategories.length > (page + 1) * 25 ||
		allChannels.length > (page + 1) * 25 ||
		allThreads.length > (page + 1) * 25 ||
		allForums.length > (page + 1) * 25;

	const baseTitle = shortTitle ?? `${ul("common.channel")}/${ul("common.thread")}`;
	const title = `${baseTitle} (P${page + 1})`.slice(0, 45);

	const modal = new ModalBuilder()
		.setCustomId(`${mode}_channels_page_${page}`)
		.setTitle(title);

	// Categories
	if (pageCategories.length > 0) {
		const categorySelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_categories")
			.setChannelTypes(ChannelType.GuildCategory)
			.setDefaultChannels(
				pageCategories.filter((c) => selectedIds.categories.has(c.id)).map((c) => c.id)
			)
			.setMaxValues(Math.min(25, pageCategories.length))
			.setRequired(false);

		const categoryLabel = new LabelBuilder()
			.setLabel(ul("common.category"))
			.setChannelSelectMenuComponent(categorySelect);
		modal.addLabelComponents(categoryLabel);
	}

	// Channels
	if (pageChannels.length > 0) {
		const channelSelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_channels")
			.setChannelTypes(ChannelType.GuildText)
			.setDefaultChannels(
				pageChannels.filter((c) => selectedIds.channels.has(c.id)).map((c) => c.id)
			)
			.setMaxValues(Math.min(25, pageChannels.length))
			.setRequired(false);

		const channelLabel = new LabelBuilder()
			.setLabel(ul("common.channel"))
			.setChannelSelectMenuComponent(channelSelect);
		modal.addLabelComponents(channelLabel);
	}

	// Threads
	if (pageThreads.length > 0) {
		const threadSelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_threads")
			.setChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
			.setDefaultChannels(
				pageThreads.filter((t) => selectedIds.threads.has(t.id)).map((t) => t.id)
			)
			.setMaxValues(Math.min(25, pageThreads.length))
			.setRequired(false);

		const threadLabel = new LabelBuilder()
			.setLabel(ul("common.thread"))
			.setChannelSelectMenuComponent(threadSelect);
		modal.addLabelComponents(threadLabel);
	}

	// Forums
	if (pageForums.length > 0) {
		const forumSelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_forums")
			.setChannelTypes(ChannelType.GuildForum)
			.setDefaultChannels(
				pageForums.filter((f) => selectedIds.forums.has(f.id)).map((f) => f.id)
			)
			.setMaxValues(Math.min(25, pageForums.length))
			.setRequired(false);

		const forumLabel = new LabelBuilder()
			.setLabel(ul("common.forum"))
			.setChannelSelectMenuComponent(forumSelect);
		modal.addLabelComponents(forumLabel);
	}

	return { hasMore, modal };
}

/**
 * Create navigation buttons for pagination
 */
export function createPaginationButtons(
	mode: CommandMode,
	page: number,
	hasMore: boolean,
	ul: Translation
): ActionRowBuilder<ButtonBuilder>[] {
	const buttons: ButtonBuilder[] = [];

	// Bouton page précédente (disabled si page 0)
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`${mode}_page_prev_${page}`)
			.setLabel(`${ul("common.previous")}`)
			.setEmoji("◀️")
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(page === 0)
	);

	// Bouton page suivante (disabled si pas de suite)
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`${mode}_page_next_${page}`)
			.setLabel(`${ul("common.next")}`)
			.setEmoji("➡️")
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(!hasMore)
	);

	// Bouton valider (toujours actif)
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`${mode}_page_validate`)
			.setLabel(ul("common.validate"))
			.setEmoji("✅")
			.setStyle(ButtonStyle.Success)
	);

	// Bouton annuler
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`${mode}_page_cancel`)
			.setLabel(ul("common.cancel"))
			.setEmoji("❌")
			.setStyle(ButtonStyle.Danger)
	);

	return [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)];
}

/**
 * Create a modal with role selector
 */
export function createRoleSelectModal(
	mode: CommandMode,
	ul: Translation,
	trackedRoles: Role[]
): ModalBuilder {
	const modal = new ModalBuilder()
		.setCustomId(`${mode}_roles_modal`)
		.setTitle(
			mode === "follow" ? ul("follow.role.description") : ul("ignore.role.description")
		);

	const roleSelect = new RoleSelectMenuBuilder()
		.setCustomId("select_roles")
		.setDefaultRoles(trackedRoles.map((r) => r.id))
		.setMaxValues(25)
		.setRequired(false);

	const roleLabel = new LabelBuilder()
		.setLabel(ul("common.role").toTitle?.() ?? ul("common.role"))
		.setRoleSelectMenuComponent(roleSelect);

	modal.addLabelComponents(roleLabel);

	return modal;
}

/**
 * Process channel type changes (additions and removals)
 */
export function processChannelTypeChanges(
	oldItems: (CategoryChannel | TextChannel | ThreadChannel | ForumChannel)[],
	newItems: (CategoryChannel | TextChannel | ThreadChannel | ForumChannel)[],
	typeName: TypeName,
	guildID: string,
	mode: CommandMode,
	ul: Translation,
	messages: string[]
) {
	const oldIds = new Set(oldItems.map((ch) => ch.id));
	const newIds = new Set(newItems.map((ch) => ch.id));

	// Get the type label for display
	let typeLabel = ul("common.channel");
	switch (typeName) {
		case TypeName.category:
			typeLabel = ul("common.category");
			break;
		case TypeName.thread:
			typeLabel = ul("common.thread");
			break;
		case TypeName.forum:
			typeLabel = ul("common.forum");
			break;
		case TypeName.channel:
			typeLabel = ul("common.channel");
			break;
	}

	const successKey =
		mode === "follow" ? "follow.thread.success" : "ignore.thread.success";
	const removeKey = mode === "follow" ? "follow.thread.remove" : "ignore.thread.remove";
	const setFunc = mode === "follow" ? setFollow : setIgnore;

	// Find removed items (were tracked, now deselected)
	for (const oldItem of oldItems) {
		if (!newIds.has(oldItem.id)) {
			const newItemsList = oldItems.filter(
				(item: CategoryChannel | ForumChannel | ThreadChannel | TextChannel) =>
					item.id !== oldItem.id
			);
			setFunc(
				typeName,
				guildID,
				newItemsList as
					| ThreadChannel[]
					| CategoryChannel[]
					| TextChannel[]
					| ForumChannel[]
			);
			messages.push(
				`[${typeLabel}] ${ul(removeKey, {
					thread: oldItem.name,
				})}`
			);
		}
	}

	// Find added items (weren't tracked, now selected)
	for (const newItem of newItems) {
		if (!oldIds.has(newItem.id)) {
			const updatedItems = [...oldItems, newItem];
			setFunc(
				typeName,
				guildID,
				updatedItems as
					| ThreadChannel[]
					| CategoryChannel[]
					| TextChannel[]
					| ForumChannel[]
			);
			messages.push(
				`[${typeLabel}] ${ul(successKey, {
					thread: newItem.name,
				})}`
			);
		}
	}
}

/**
 * Process role changes (additions and removals)
 */
export function processRoleTypeChanges(
	guildID: string,
	mode: CommandMode,
	oldRoles: Role[],
	newRoles: Role[],
	ul: Translation,
	messages: string[]
) {
	const oldIds = new Set(oldRoles.map((r) => r.id));
	const newIds = new Set(newRoles.map((r) => r.id));

	const addedRoles: Role[] = [];
	const removedRoles: Role[] = [];

	const addedKey = mode === "follow" ? "follow.role.added" : "ignore.role.added";
	const removedKey = mode === "follow" ? "follow.role.removed" : "ignore.role.removed";

	// Find removed roles (were tracked, now deselected)
	for (const oldRole of oldRoles) {
		if (!newIds.has(oldRole.id)) {
			removedRoles.push(oldRole);
			messages.push(
				ul(removedKey, {
					role: roleMention(oldRole.id),
				})
			);
		}
	}

	// Find added roles (weren't tracked, now selected)
	for (const newRole of newRoles) {
		if (!oldIds.has(newRole.id)) {
			addedRoles.push(newRole);
			messages.push(
				ul(addedKey, {
					role: roleMention(newRole.id),
				})
			);
		}
	}

	// Calculate final roles list and save once
	let finalRoles = oldRoles.filter(
		(r) => !removedRoles.some((removed) => removed.id === r.id)
	);
	finalRoles = [...finalRoles, ...addedRoles];
	setRole(mode, guildID, finalRoles);
}
