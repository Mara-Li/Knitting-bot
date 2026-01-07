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
import { type ChannelType_, type Translation, TypeName } from "../interface";
import { setRole, setTrackedItem } from "../maps";
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
		.setDefaultChannels(trackedItems.categories)
		.setMaxValues(25)
		.setRequired(false);

	const categoryLabel = new LabelBuilder()
		.setLabel(ul("common.category"))
		.setChannelSelectMenuComponent(categorySelect);

	// Text channels select menu
	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_channels")
		.setChannelTypes(ChannelType.GuildText)
		.setDefaultChannels(trackedItems.channels)
		.setMaxValues(25)
		.setRequired(false);

	const channelLabel = new LabelBuilder()
		.setLabel(ul("common.channel"))
		.setChannelSelectMenuComponent(channelSelect);

	// Threads select menu
	const threadSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_threads")
		.setChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
		.setDefaultChannels(trackedItems.threads)
		.setMaxValues(25)
		.setRequired(false);

	const threadLabel = new LabelBuilder()
		.setLabel(ul("common.thread"))
		.setChannelSelectMenuComponent(threadSelect);

	// Forum select menu
	const forumSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_forums")
		.setChannelTypes(ChannelType.GuildForum)
		.setDefaultChannels(trackedItems.forums)
		.setMaxValues(25)
		.setRequired(false);

	const forumLabel = new LabelBuilder()
		.setLabel(ul("common.forum"))
		.setChannelSelectMenuComponent(forumSelect);

	modal.addLabelComponents(categoryLabel, channelLabel, threadLabel, forumLabel);

	return modal;
}

/**
 * Create a paginated modal for a specific channel type
 */
export async function createPaginatedChannelModalByType(
	mode: CommandMode,
	ul: Translation,
	_guild: Guild,
	page: number,
	channelType: ChannelType_,
	trackedIds: string[],
	shortTitle?: string,
	_showOnlyTracked = true
): Promise<{
	modal: ModalBuilder;
	hasMore: boolean;
	pageItemIds: string[];
}> {
	// Déterminer les types Discord selon le type de channel
	let djsChannelTypes: ChannelType[] = [];

	if (channelType === "category") {
		djsChannelTypes = [ChannelType.GuildCategory];
	} else if (channelType === "channel") {
		djsChannelTypes = [ChannelType.GuildText];
	} else if (channelType === "thread") {
		djsChannelTypes = [ChannelType.PublicThread, ChannelType.PrivateThread];
	} else if (channelType === "forum") {
		djsChannelTypes = [ChannelType.GuildForum];
	}

	const baseTitle = shortTitle ?? `${ul(`common.${channelType}`)}`;
	const title = `${baseTitle} (P${page + 1})`.slice(0, 45);

	const modal = new ModalBuilder()
		.setCustomId(`${mode}_${channelType}_page_${page}`)
		.setTitle(title);

	// Toujours créer le select, avec defaultChannels si items existent
	const select = new ChannelSelectMenuBuilder()
		.setCustomId(`select_${channelType}`)
		.setChannelTypes(...djsChannelTypes)
		.setMaxValues(25)
		.setRequired(false);

	// Ajouter les defaultChannels si il y a des items tracked
	if (trackedIds.length > 0) {
		select.setDefaultChannels(trackedIds);
	}

	const label = new LabelBuilder()
		.setLabel(ul(`common.${channelType}`))
		.setChannelSelectMenuComponent(select);

	modal.addLabelComponents(label);

	return {
		hasMore: false, // Calculé en dehors maintenant
		modal,
		pageItemIds: trackedIds,
	};
}

/**
 * Create a paginated modal with channel selectors
 */
export async function createPaginatedChannelModal(
	mode: CommandMode,
	ul: Translation,
	_guild: Guild,
	page: number,
	selectedIds: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	},
	shortTitle?: string
): Promise<{
	modal: ModalBuilder;
	hasMore: boolean;
	pageItemIds: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	};
}> {
	const baseTitle = shortTitle ?? `${ul("common.channel")}/${ul("common.thread")}`;
	const title = `${baseTitle} (P${page + 1})`.slice(0, 45);

	const modal = new ModalBuilder()
		.setCustomId(`${mode}_channels_page_${page}`)
		.setTitle(title);

	// Categories
	if (selectedIds.categories.length > 0) {
		const categorySelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_categories")
			.setChannelTypes(ChannelType.GuildCategory)
			.setDefaultChannels(selectedIds.categories)
			.setMaxValues(Math.min(25, selectedIds.categories.length))
			.setRequired(false);

		const categoryLabel = new LabelBuilder()
			.setLabel(ul("common.category"))
			.setChannelSelectMenuComponent(categorySelect);
		modal.addLabelComponents(categoryLabel);
	}

	// Channels
	if (selectedIds.channels.length > 0) {
		const channelSelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_channels")
			.setChannelTypes(ChannelType.GuildText)
			.setDefaultChannels(selectedIds.channels)
			.setMaxValues(25)
			.setRequired(false);

		const channelLabel = new LabelBuilder()
			.setLabel(ul("common.channel"))
			.setChannelSelectMenuComponent(channelSelect);
		modal.addLabelComponents(channelLabel);
	}

	// Threads
	if (selectedIds.threads.length > 0) {
		const threadSelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_threads")
			.setChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
			.setDefaultChannels(selectedIds.threads)
			.setMaxValues(25)
			.setRequired(false);

		const threadLabel = new LabelBuilder()
			.setLabel(ul("common.thread"))
			.setChannelSelectMenuComponent(threadSelect);
		modal.addLabelComponents(threadLabel);
	}

	// Forums
	if (selectedIds.forums.length > 0) {
		const forumSelect = new ChannelSelectMenuBuilder()
			.setCustomId("select_forums")
			.setChannelTypes(ChannelType.GuildForum)
			.setDefaultChannels(selectedIds.forums)
			.setMaxValues(25)
			.setRequired(false);

		const forumLabel = new LabelBuilder()
			.setLabel(ul("common.forum"))
			.setChannelSelectMenuComponent(forumSelect);
		modal.addLabelComponents(forumLabel);
	}

	return {
		hasMore: false, // Calculé en dehors
		modal,
		pageItemIds: selectedIds,
	};
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

	// Bouton modifier (ouvre le modal pour cette page)
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`${mode}_page_modify_${page}`)
			.setLabel(ul("common.modify"))
			.setEmoji("✏️")
			.setStyle(ButtonStyle.Primary)
	);

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
	console.log(
		`[processChannelTypeChanges] Called with mode="${mode}", typeName="${typeName}"`
	);
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

	// Find removed items (were tracked, now deselected)
	for (const oldItem of oldItems) {
		if (!newIds.has(oldItem.id)) {
			const mention =
				oldItem.type === ChannelType.GuildCategory ? oldItem.name : `<#${oldItem.id}>`;
			messages.push(
				ul(removeKey, {
					thread: mention,
				})
			);
		}
	}

	// Find added items (weren't tracked, now selected)
	for (const newItem of newItems) {
		if (!oldIds.has(newItem.id)) {
			const mention =
				newItem.type === ChannelType.GuildCategory ? newItem.name : `<#${newItem.id}>`;
			messages.push(
				ul(successKey, {
					thread: mention,
				})
			);
		}
	}

	// Save the final list ONCE with all newItems
	console.log(
		`[processChannelTypeChanges] Saving ${newItems.length} items using setTrackedItem(${mode})`
	);
	setTrackedItem(
		mode,
		typeName,
		guildID,
		newItems.map((item) => item.id)
	);
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
	setRole(
		mode,
		guildID,
		finalRoles.map((r) => r.id)
	);
}
