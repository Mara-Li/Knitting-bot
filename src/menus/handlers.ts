import * as Djs from "discord.js";
import db from "../database.js";
import type {
	ArrayChannel,
	CommandMode,
	PaginatedIdsState,
	RoleIn,
	TChannel,
	Translation,
} from "../interfaces";
import { resolveChannelsByIds } from "../utils";
import { respondInteraction } from "./paginated";
import { deletePaginationState, getPaginationState } from "./state";
import { resolveIds } from "./utils";

/**
 * Generic validation and save for channel selections
 */
export async function validateAndSave(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	userId: string,
	guildID: string,
	channelType: TChannel,
	trackedIds: string[],
	ul: Translation,
	mode: CommandMode
) {
	const stateKey = `${userId}_${guildID}_${mode}_${channelType}`;
	const state = getPaginationState(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const finalIds = Array.from(state.selectedIds);

	const { finalChannelsResolved, originalChannelsResolved, typeName } = await resolveIds(
		channelType,
		guild,
		trackedIds,
		finalIds
	);

	const mentionFromId = (id: string) => {
		const channel = finalChannelsResolved.find((ch) => ch.id === id);
		if (!channel) return `<#${id}>`;
		return channel.type === Djs.ChannelType.GuildCategory ? channel.name : `<#${id}>`;
	};

	const oppositeMode: CommandMode = mode === "follow" ? "ignore" : "follow";
	const oppositeTrackedIds = new Set(db.getMaps(oppositeMode, typeName, guildID));
	const conflictIds = finalIds.filter((id) => oppositeTrackedIds.has(id));
	if (conflictIds.length > 0) {
		const conflictKey =
			mode === "ignore" ? "ignore.error.conflictTracked" : "follow.error.conflictTracked";
		const conflictMessage = ul(conflictKey, {
			item: conflictIds.map((id) => mentionFromId(id)).join(", "),
		});

		await respondInteraction(interaction, conflictMessage, interaction.isModalSubmit());
		deletePaginationState(stateKey);
		return;
	}

	const changeMessages = buildChangeMessages(
		originalChannelsResolved,
		finalChannelsResolved,
		mode,
		ul
	);

	// Save the changes
	db.setTrackedItem(
		mode,
		typeName,
		guildID,
		finalChannelsResolved.map((item) => item.id)
	);

	const finalMessage =
		changeMessages.length > 0
			? ul("common.summary", { changes: `\n- ${changeMessages.join("\n- ")}` })
			: ul("common.noChanges");

	await respondInteraction(interaction, finalMessage, interaction.isModalSubmit());
	deletePaginationState(stateKey);
}

/**
 * Generic validation and save for roleIn selections
 */
export async function validateRoleInAndSave(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	userId: string,
	guildID: string,
	roleId: string,
	channelType: TChannel,
	trackedIds: string[],
	ul: Translation,
	mode: CommandMode
) {
	const stateKey = `${userId}_${guildID}_${mode}_roleIn_${roleId}_${channelType}`;
	const context = await ensureRoleInContext(interaction, stateKey, roleId, ul);
	if (!context) return;

	const { guild, state } = context;
	const finalIds = Array.from(state.selectedIds);

	const { finalChannelsResolved, originalChannelsResolved, mentionFromChannel } =
		await resolveRoleInChannels(channelType, guild, trackedIds, finalIds);

	const hasConflict = await handleRoleInConflicts({
		channelType,
		finalChannelsResolved,
		finalIds,
		guild,
		guildID,
		interaction,
		mentionFromChannel,
		mode,
		roleId,
		stateKey,
		ul,
	});
	if (hasConflict) return;

	const messages = buildRoleInChangeMessages(
		finalChannelsResolved,
		originalChannelsResolved,
		mentionFromChannel,
		mode,
		ul
	);

	await persistRoleInSelection({
		channelType,
		finalIds,
		guild,
		guildID,
		interaction,
		messages,
		mode,
		roleId,
		stateKey,
		ul,
	});
}

/**
 * Build change messages for channel types
 */
function buildChangeMessages(
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
	mode: CommandMode,
	ul: Translation
): string[] {
	const messages: string[] = [];
	const oldIds = new Set(oldItems.map((ch) => ch.id));
	const newIds = new Set(newItems.map((ch) => ch.id));

	const successKey =
		mode === "follow" ? "follow.thread.success" : "ignore.thread.success";
	const removeKey = mode === "follow" ? "follow.thread.remove" : "ignore.thread.remove";

	// Find removed items
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

	// Find added items
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

	return messages;
}

/**
 * Ensure role context exists (guild, state, role)
 */
async function ensureRoleInContext(
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction,
	stateKey: string,
	roleId: string,
	ul: Translation
): Promise<{ state: PaginatedIdsState; guild: Djs.Guild; role: Djs.Role } | undefined> {
	const state = getPaginationState(stateKey);
	if (!state) return;

	const guild = interaction.guild;
	if (!guild) return;

	const role = guild.roles.cache.get(roleId);
	if (!role) {
		const errorMsg = ul("ignore.role.error", { role: roleId });
		await respondInteraction(interaction, errorMsg, true);
		return;
	}

	return { guild, role, state };
}

/**
 * Resolve channels for roleIn context
 */
async function resolveRoleInChannels(
	channelType: TChannel,
	guild: Djs.Guild,
	trackedIds: string[],
	finalIds: string[]
) {
	const { finalChannelsResolved, originalChannelsResolved } = await resolveIds(
		channelType,
		guild,
		trackedIds,
		finalIds
	);

	const mentionFromChannel = (
		channel:
			| Djs.CategoryChannel
			| Djs.TextChannel
			| Djs.AnyThreadChannel
			| Djs.ForumChannel
	) => {
		return channel.type === Djs.ChannelType.GuildCategory
			? channel.name
			: `<#${channel.id}>`;
	};

	return { finalChannelsResolved, mentionFromChannel, originalChannelsResolved };
}

/**
 * Handle roleIn conflicts between follow/ignore modes
 */
async function handleRoleInConflicts({
	interaction,
	stateKey,
	guild,
	guildID,
	roleId,
	channelType,
	mode,
	ul,
	finalIds,
	finalChannelsResolved,
	mentionFromChannel,
}: {
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction;
	stateKey: string;
	guild: Djs.Guild;
	guildID: string;
	roleId: string;
	channelType: TChannel;
	mode: CommandMode;
	ul: Translation;
	finalIds: string[];
	finalChannelsResolved: Array<
		Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
	>;
	mentionFromChannel: (
		channel:
			| Djs.CategoryChannel
			| Djs.TextChannel
			| Djs.AnyThreadChannel
			| Djs.ForumChannel
	) => string;
}) {
	const oppositeMode: CommandMode = mode === "follow" ? "ignore" : "follow";
	const oppositeRoleIn = db.settings.get(guildID, `${oppositeMode}.OnlyRoleIn`) ?? []; //getRoleIn(oppositeMode, guildID);
	const oppositeForRole = oppositeRoleIn.find((r) => r.roleId === roleId);
	const oppositeChannelIds = new Set(oppositeForRole?.channelIds ?? []);

	const { finalChannelsResolved: oppositeByType } = await resolveIds(
		channelType,
		guild,
		[],
		Array.from(oppositeChannelIds)
	);
	const oppositeTypeIds = new Set(oppositeByType.map((ch) => ch.id));

	const conflictIds = finalIds.filter((id) => oppositeTypeIds.has(id));
	if (conflictIds.length === 0) return false;

	const conflictChannels = finalChannelsResolved.filter((ch) =>
		conflictIds.includes(ch.id)
	);
	const conflictKey =
		mode === "ignore" ? "ignore.error.conflictTracked" : "follow.error.conflictTracked";
	const conflictMessage = ul(conflictKey, {
		item: conflictChannels.map((ch) => mentionFromChannel(ch)).join(", "),
	});

	await respondInteraction(interaction, conflictMessage, true);
	deletePaginationState(stateKey);
	return true;
}

/**
 * Build change messages for roleIn selections
 */
function buildRoleInChangeMessages(
	finalChannelsResolved: ArrayChannel,
	originalChannelsResolved: ArrayChannel,
	mentionFromChannel: (
		channel:
			| Djs.CategoryChannel
			| Djs.TextChannel
			| Djs.AnyThreadChannel
			| Djs.ForumChannel
	) => string,
	mode: CommandMode,
	ul: Translation
) {
	const messages: string[] = [];
	const oldIds = new Set(originalChannelsResolved.map((ch) => ch.id));
	const newIds = new Set(finalChannelsResolved.map((ch) => ch.id));

	const successKey =
		mode === "follow" ? "follow.thread.success" : "ignore.thread.success";
	const removeKey = mode === "follow" ? "follow.thread.remove" : "ignore.thread.remove";

	for (const oldChannel of originalChannelsResolved) {
		if (!newIds.has(oldChannel.id)) {
			messages.push(
				ul(removeKey, {
					thread: mentionFromChannel(oldChannel),
				})
			);
		}
	}

	for (const newChannel of finalChannelsResolved) {
		if (!oldIds.has(newChannel.id)) {
			messages.push(
				ul(successKey, {
					thread: mentionFromChannel(newChannel),
				})
			);
		}
	}

	return messages;
}

/**
 * Persist roleIn selection to the database
 */
async function persistRoleInSelection({
	interaction,
	stateKey,
	guild,
	guildID,
	roleId,
	channelType,
	finalIds,
	messages,
	ul,
	mode,
}: {
	interaction: Djs.ButtonInteraction | Djs.ModalSubmitInteraction;
	stateKey: string;
	guild: Djs.Guild;
	guildID: string;
	roleId: string;
	channelType: TChannel;
	finalIds: string[];
	messages: string[];
	ul: Translation;
	mode: CommandMode;
}) {
	const allRoleIn = db.settings.get(guildID, `${mode}.OnlyRoleIn`) ?? []; //getRoleIn(mode, guildID);
	const existingEntry = allRoleIn.find((r) => r.roleId === roleId);

	const allChannelTypesIds: string[] = [];

	if (existingEntry) {
		const allExistingChannels = await resolveChannelsByIds<
			Djs.CategoryChannel | Djs.TextChannel | Djs.AnyThreadChannel | Djs.ForumChannel
		>(guild, existingEntry.channelIds, [
			Djs.ChannelType.GuildCategory,
			Djs.ChannelType.GuildText,
			Djs.ChannelType.PublicThread,
			Djs.ChannelType.PrivateThread,
			Djs.ChannelType.GuildForum,
		]);

		const otherTypeChannels = allExistingChannels.filter((ch) => {
			if (channelType === "category") return ch.type !== Djs.ChannelType.GuildCategory;
			if (channelType === "channel") return ch.type !== Djs.ChannelType.GuildText;
			if (channelType === "forum") return ch.type !== Djs.ChannelType.GuildForum;
			if (channelType === "thread")
				return (
					ch.type !== Djs.ChannelType.PublicThread &&
					ch.type !== Djs.ChannelType.PrivateThread
				);
			return true;
		});

		allChannelTypesIds.push(...otherTypeChannels.map((ch) => ch.id));
	}

	allChannelTypesIds.push(...finalIds);

	if (allChannelTypesIds.length === 0) {
		const updatedRoleIn = allRoleIn.filter((r) => r.roleId !== roleId);
		//setRoleIn(mode, guildID, updatedRoleIn);
		db.settings.set(guildID, updatedRoleIn, `${mode}.OnlyRoleIn`);
		const finalMessage = ul("roleIn.noLonger.any", {
			mention: Djs.roleMention(roleId),
			on: ul(`roleIn.on.${mode}`),
		});

		await respondInteraction(interaction, finalMessage, true);
		deletePaginationState(stateKey);
		return;
	}

	const newEntry: RoleIn = {
		channelIds: allChannelTypesIds,
		roleId,
	};

	if (existingEntry) {
		const updated = allRoleIn.map((r) => (r.roleId === roleId ? newEntry : r));
		//setRoleIn(mode, guildID, updated);
		db.settings.set(guildID, updated, `${mode}.OnlyRoleIn`);
	}
	//setRoleIn(mode, guildID, [...allRoleIn, newEntry]);
	else db.settings.set(guildID, [...allRoleIn, newEntry], `${mode}.OnlyRoleIn`);

	const finalMessage =
		messages.length > 0
			? ul("common.summary", { changes: `\n- ${messages.join("\n- ")}` })
			: ul("common.noChanges");

	await respondInteraction(interaction, finalMessage, true);
	deletePaginationState(stateKey);
}

/**
 * Check roleIn configuration constraints
 */
export async function checkRoleInConstraints(
	interaction: Djs.ChatInputCommandInteraction,
	guildID: string,
	mode: CommandMode,
	ul: Translation
): Promise<boolean> {
	if (
		mode === "follow" &&
		(db.settings.get(guildID, "configuration.followOnlyChannel") ||
			db.settings.get(guildID, "configuration.followOnlyRole"))
	) {
		await interaction.reply({
			content: ul("roleIn.error.otherMode"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return false;
	}

	if (!db.settings.get(guildID, "configuration.followOnlyRoleIn") && mode === "follow") {
		await interaction.reply({
			content: ul("roleIn.error.need"),
			flags: Djs.MessageFlags.Ephemeral,
		});
		return false;
	}

	return true;
}

/**
 * Process role changes (additions and removals)
 * Used by follow.ts and ignore.ts commands
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

	const removedIds = new Set(removedRoles.map((r) => r.id));
	const finalRoles = [...oldRoles.filter((r) => !removedIds.has(r.id)), ...addedRoles];
	/*setRole(
		mode,
		guildID,
		finalRoles.map((r) => r.id)
	);*/
	db.settings.set(
		guildID,
		finalRoles.map((r) => r.id),
		`${mode}.role`
	);
}
