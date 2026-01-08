import type { ModalBuilder } from "discord.js";
import * as Djs from "discord.js";
import type { TChannel, Translation } from "../interface";
import type { CommandMode, TrackedItems } from "./interfaces";

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
export function createFirstPageChannelModalByType(
	mode: CommandMode,
	ul: Translation,
	channelType: TChannel,
	trackedIds: string[],
	shortTitle?: string
): { modal: ModalBuilder; hasMore: boolean; pageItemIds: string[] } {
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
export function createPaginatedChannelModal(
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
): {
	modal: Djs.ModalBuilder;
	hasMore: boolean;
	pageItemIds: {
		categories: string[];
		channels: string[];
		threads: string[];
		forums: string[];
	};
} {
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
			.setMaxValues(25)
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
