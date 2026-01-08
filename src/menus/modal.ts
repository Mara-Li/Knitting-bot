import type { ModalBuilder } from "discord.js";
import * as Djs from "discord.js";
import type { TChannel, Translation, TypeName } from "../interface";
import { setRole, setTrackedItem } from "../maps";
import type { CommandMode, TrackedItems } from "./items";

/**
 * Create a modal with 4 channel type selectors
 */
export function createChannelSelectorsModal(
	mode: CommandMode,
	ul: Translation,
	trackedItems: TrackedItems
): Djs.ModalBuilder {
	const modal = new Djs.ModalBuilder()
		.setCustomId(`${mode}_channels_modal`)
		.setTitle(
			mode === "follow"
				? ul("follow.thread.description")
				: ul("ignore.thread.description")
		);

	// Categories select menu
	const categorySelect = new Djs.ChannelSelectMenuBuilder()
		.setCustomId("select_categories")
		.setChannelTypes(Djs.ChannelType.GuildCategory)
		.setDefaultChannels(trackedItems.categories)
		.setMaxValues(25)
		.setRequired(false);

	const categoryLabel = new Djs.LabelBuilder()
		.setLabel(ul("common.category"))
		.setChannelSelectMenuComponent(categorySelect);

	// Text channels select menu
	const channelSelect = new Djs.ChannelSelectMenuBuilder()
		.setCustomId("select_channels")
		.setChannelTypes(Djs.ChannelType.GuildText)
		.setDefaultChannels(trackedItems.channels)
		.setMaxValues(25)
		.setRequired(false);

	const channelLabel = new Djs.LabelBuilder()
		.setLabel(ul("common.channel"))
		.setChannelSelectMenuComponent(channelSelect);

	// Threads select menu
	const threadSelect = new Djs.ChannelSelectMenuBuilder()
		.setCustomId("select_threads")
		.setChannelTypes(Djs.ChannelType.PublicThread, Djs.ChannelType.PrivateThread)
		.setDefaultChannels(trackedItems.threads)
		.setMaxValues(25)
		.setRequired(false);

	const threadLabel = new Djs.LabelBuilder()
		.setLabel(ul("common.thread"))
		.setChannelSelectMenuComponent(threadSelect);

	// Forum select menu
	const forumSelect = new Djs.ChannelSelectMenuBuilder()
		.setCustomId("select_forums")
		.setChannelTypes(Djs.ChannelType.GuildForum)
		.setDefaultChannels(trackedItems.forums)
		.setMaxValues(25)
		.setRequired(false);

	const forumLabel = new Djs.LabelBuilder()
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
	channelType: TChannel,
	trackedIds: string[],
	shortTitle?: string
): Promise<{ modal: ModalBuilder; hasMore: boolean; pageItemIds: string[] }> {
	const page = 0;
	const channelTypeMap: Record<TChannel, Djs.ChannelType[]> = {
		category: [Djs.ChannelType.GuildCategory],
		channel: [Djs.ChannelType.GuildText],
		forum: [Djs.ChannelType.GuildForum],
		thread: [Djs.ChannelType.PublicThread, Djs.ChannelType.PrivateThread],
	};

	const djsChannelTypes = channelTypeMap[channelType];

	const baseTitle = shortTitle ?? `${ul(`common.${channelType}`)}`;
	const title = `${baseTitle} (P${page + 1})`.slice(0, 45);

	const modal = new Djs.ModalBuilder()
		.setCustomId(`${mode}_${channelType}_page_${page}`)
		.setTitle(title);

	const select = new Djs.ChannelSelectMenuBuilder()
		.setCustomId(`select_${channelType}`)
		.setChannelTypes(...djsChannelTypes)
		.setMaxValues(25)
		.setRequired(false);

	if (trackedIds.length > 0) {
		select.setDefaultChannels(trackedIds);
	}

	const label = new Djs.LabelBuilder()
		.setLabel(ul(`common.${channelType}`))
		.setChannelSelectMenuComponent(select);

	modal.addLabelComponents(label);

	return {
		hasMore: false,
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
	page: number,
	selectedIds: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	},
	shortTitle?: string
): Promise<{
	modal: Djs.ModalBuilder;
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

	const modal = new Djs.ModalBuilder()
		.setCustomId(`${mode}_channels_page_${page}`)
		.setTitle(title);

	if (selectedIds.categories.length > 0) {
		const categorySelect = new Djs.ChannelSelectMenuBuilder()
			.setCustomId("select_categories")
			.setChannelTypes(Djs.ChannelType.GuildCategory)
			.setDefaultChannels(selectedIds.categories)
			.setMaxValues(Math.min(25, selectedIds.categories.length))
			.setRequired(false);

		const categoryLabel = new Djs.LabelBuilder()
			.setLabel(ul("common.category"))
			.setChannelSelectMenuComponent(categorySelect);
		modal.addLabelComponents(categoryLabel);
	}

	if (selectedIds.channels.length > 0) {
		const channelSelect = new Djs.ChannelSelectMenuBuilder()
			.setCustomId("select_channels")
			.setChannelTypes(Djs.ChannelType.GuildText)
			.setDefaultChannels(selectedIds.channels)
			.setMaxValues(25)
			.setRequired(false);

		const channelLabel = new Djs.LabelBuilder()
			.setLabel(ul("common.channel"))
			.setChannelSelectMenuComponent(channelSelect);
		modal.addLabelComponents(channelLabel);
	}

	if (selectedIds.threads.length > 0) {
		const threadSelect = new Djs.ChannelSelectMenuBuilder()
			.setCustomId("select_threads")
			.setChannelTypes(Djs.ChannelType.PublicThread, Djs.ChannelType.PrivateThread)
			.setDefaultChannels(selectedIds.threads)
			.setMaxValues(25)
			.setRequired(false);

		const threadLabel = new Djs.LabelBuilder()
			.setLabel(ul("common.thread"))
			.setChannelSelectMenuComponent(threadSelect);
		modal.addLabelComponents(threadLabel);
	}

	if (selectedIds.forums.length > 0) {
		const forumSelect = new Djs.ChannelSelectMenuBuilder()
			.setCustomId("select_forums")
			.setChannelTypes(Djs.ChannelType.GuildForum)
			.setDefaultChannels(selectedIds.forums)
			.setMaxValues(25)
			.setRequired(false);

		const forumLabel = new Djs.LabelBuilder()
			.setLabel(ul("common.forum"))
			.setChannelSelectMenuComponent(forumSelect);
		modal.addLabelComponents(forumLabel);
	}

	return {
		hasMore: false,
		modal,
		pageItemIds: selectedIds,
	};
}

/**
 * Create a modal with role selector
 */
export function createRoleSelectModal(
	mode: CommandMode,
	ul: Translation,
	trackedRoles: Djs.Role[]
): Djs.ModalBuilder {
	const modal = new Djs.ModalBuilder()
		.setCustomId(`${mode}_roles_modal`)
		.setTitle(
			mode === "follow" ? ul("follow.role.description") : ul("ignore.role.description")
		);

	const roleSelect = new Djs.RoleSelectMenuBuilder()
		.setCustomId("select_roles")
		.setDefaultRoles(trackedRoles.map((r) => r.id))
		.setMaxValues(25)
		.setRequired(false);

	const roleLabel = new Djs.LabelBuilder()
		.setLabel(ul("common.role").toTitle?.() ?? ul("common.role"))
		.setRoleSelectMenuComponent(roleSelect);

	modal.addLabelComponents(roleLabel);

	return modal;
}

/**
 * Process channel type changes (additions and removals)
 */
export function processChannelTypeChanges(
	oldItems: (
		| Djs.CategoryChannel
		| Djs.TextChannel
		| Djs.ThreadChannel
		| Djs.ForumChannel
	)[],
	newItems: (
		| Djs.CategoryChannel
		| Djs.TextChannel
		| Djs.ThreadChannel
		| Djs.ForumChannel
	)[],
	typeName: TypeName,
	guildID: string,
	mode: CommandMode,
	ul: Translation,
	messages: string[]
) {
	// processChannelTypeChanges called
	const oldIds = new Set(oldItems.map((ch) => ch.id));
	const newIds = new Set(newItems.map((ch) => ch.id));

	const successKey =
		mode === "follow" ? "follow.thread.success" : "ignore.thread.success";
	const removeKey = mode === "follow" ? "follow.thread.remove" : "ignore.thread.remove";

	// Find removed items (were tracked, now deselected)
	for (const oldItem of oldItems) {
		if (!newIds.has(oldItem.id)) {
			const mention =
				oldItem.type === Djs.ChannelType.GuildCategory
					? oldItem.name
					: `<#${oldItem.id}>`;
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
				newItem.type === Djs.ChannelType.GuildCategory
					? newItem.name
					: `<#${newItem.id}>`;
			messages.push(
				ul(successKey, {
					thread: mention,
				})
			);
		}
	}

	// Save the final list ONCE with all newItems
	// Saving final list of items
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
	oldRoles: Djs.Role[],
	newRoles: Djs.Role[],
	ul: Translation,
	messages: string[]
) {
	const oldIds = new Set(oldRoles.map((r) => r.id));
	const newIds = new Set(newRoles.map((r) => r.id));

	const addedRoles: Djs.Role[] = [];
	const removedRoles: Djs.Role[] = [];

	const addedKey = mode === "follow" ? "follow.role.added" : "ignore.role.added";
	const removedKey = mode === "follow" ? "follow.role.removed" : "ignore.role.removed";

	// Find removed roles (were tracked, now deselected)
	for (const oldRole of oldRoles) {
		if (!newIds.has(oldRole.id)) {
			removedRoles.push(oldRole);
			messages.push(
				ul(removedKey, {
					role: Djs.roleMention(oldRole.id),
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
					role: Djs.roleMention(newRole.id),
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
