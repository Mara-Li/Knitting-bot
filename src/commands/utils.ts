import {
	type CategoryChannel,
	ChannelSelectMenuBuilder,
	ChannelType,
	type ChatInputCommandInteraction,
	channelMention,
	type ForumChannel,
	LabelBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	type Role,
	roleMention,
	type TextChannel,
	type ThreadChannel,
} from "discord.js";
import { getUl, t } from "../i18n";
import { CommandName, type RoleIn } from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";

/**
 * Follow or ignore roles in specific channels using a modal
 * @param interaction {@link ChatInputCommandInteraction} The interaction that triggered the command.
 * @param on {"follow" | "ignore"} The mode to use
 */
export async function interactionRoleInChannel(
	interaction: ChatInputCommandInteraction,
	on: "follow" | "ignore"
) {
	const opposite = on === "follow" ? "ignore" : "follow";
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	const ul = getUl(interaction);

	if (
		on === "follow" &&
		(getConfig(CommandName.followOnlyChannel, guild) ||
			getConfig(CommandName.followOnlyRole, guild))
	) {
		await interaction.reply({
			content: ul("roleIn.error.otherMode") as string,
		});
		return;
	}

	if (!getConfig(CommandName.followOnlyRoleIn, guild) && on === "follow") {
		await interaction.reply({
			content: ul("roleIn.error.need") as string,
		});
		return;
	}

	const roleOpt = interaction.options.get(t("common.role").toLowerCase());
	if (!roleOpt || !roleOpt.role) {
		await interaction.reply({
			content: ul("ignore.role.error", { role: roleOpt?.name }) as string,
		});
		return;
	}

	const allRoleIn = getRoleIn(on, guild);
	const existingRoleIn = allRoleIn.find((r: RoleIn) => r.role.id === roleOpt.role?.id);

	// Create modal with 4 separate channel type selectors
	const modal = new ModalBuilder()
		.setCustomId("roleIn_modal")
		.setTitle(ul(`roleIn.on.${on}`));

	// Categories select menu
	const categorySelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_roleIn_categories")
		.setChannelTypes(ChannelType.GuildCategory)
		.setDefaultChannels(
			existingRoleIn?.channels
				.filter((c) => c.type === ChannelType.GuildCategory)
				.map((c) => c.id) ?? []
		)
		.setMaxValues(25)
		.setRequired(false);

	const categoryLabel = new LabelBuilder()
		.setLabel(ul("common.category"))
		.setChannelSelectMenuComponent(categorySelect);

	// Text channels select menu
	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_roleIn_channels")
		.setChannelTypes(ChannelType.GuildText)
		.setDefaultChannels(
			existingRoleIn?.channels
				.filter((c) => c.type === ChannelType.GuildText)
				.map((c) => c.id) ?? []
		)
		.setMaxValues(25)
		.setRequired(false);

	const channelLabel = new LabelBuilder()
		.setLabel(ul("common.channel"))
		.setChannelSelectMenuComponent(channelSelect);

	// Threads select menu
	const threadSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_roleIn_threads")
		.setChannelTypes(ChannelType.PublicThread, ChannelType.PrivateThread)
		.setDefaultChannels(
			existingRoleIn?.channels
				.filter(
					(c) =>
						c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread
				)
				.map((c) => c.id) ?? []
		)
		.setMaxValues(25)
		.setRequired(false);

	const threadLabel = new LabelBuilder()
		.setLabel(ul("common.thread"))
		.setChannelSelectMenuComponent(threadSelect);

	// Forums select menu
	const forumSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_roleIn_forums")
		.setChannelTypes(ChannelType.GuildForum)
		.setDefaultChannels(
			existingRoleIn?.channels
				.filter((c) => c.type === ChannelType.GuildForum)
				.map((c) => c.id) ?? []
		)
		.setMaxValues(25)
		.setRequired(false);

	const forumLabel = new LabelBuilder()
		.setLabel(ul("common.forum"))
		.setChannelSelectMenuComponent(forumSelect);

	modal.addLabelComponents(categoryLabel, channelLabel, threadLabel, forumLabel);

	try {
		const collectorFilter = (i: ModalSubmitInteraction) => {
			return i.user.id === interaction.user.id;
		};

		await interaction.showModal(modal);

		const selection = await interaction.awaitModalSubmit({
			filter: collectorFilter,
			time: 60_000,
		});

		const selectedCategories = selection.fields.getSelectedChannels(
			"select_roleIn_categories",
			false,
			[ChannelType.GuildCategory]
		);
		const selectedChannels = selection.fields.getSelectedChannels(
			"select_roleIn_channels",
			false,
			[ChannelType.GuildText]
		);
		const selectedThreads = selection.fields.getSelectedChannels(
			"select_roleIn_threads",
			false,
			[ChannelType.PublicThread, ChannelType.PrivateThread]
		);
		const selectedForums = selection.fields.getSelectedChannels(
			"select_roleIn_forums",
			false,
			[ChannelType.GuildForum]
		);

		// Combine all selected channels
		const allSelectedChannels = [
			...Array.from((selectedCategories ?? new Map()).values()),
			...Array.from((selectedChannels ?? new Map()).values()),
			...Array.from((selectedThreads ?? new Map()).values()),
			...Array.from((selectedForums ?? new Map()).values()),
		];

		const role = roleOpt.role;
		const channels = allSelectedChannels;
		const mention = roleMention(role.id);

		if (channels.length === 0) {
			// No channels selected - remove the role entirely
			const newRolesIn: RoleIn[] = allRoleIn.filter((r: RoleIn) => r.role.id !== role.id);
			setRoleIn(on, guild, newRolesIn);
			const translationOn = ul(`roleIn.on.${on}`);
			const message = ul("roleIn.noLonger.any", {
				mention: mention,
				on: translationOn,
			}) as string;
			await selection.reply({
				content: message,
				ephemeral: true,
			});
		} else {
			// Check if role already exists
			const roleIn = allRoleIn.find((r: RoleIn) => r.role.id === role.id);

			// Update or create role entry
			if (roleIn) {
				// Update existing role entry
				const updatedRoles = allRoleIn.map((r) =>
					r.role.id === role.id
						? {
								...r,
								channels: channels as (
									| CategoryChannel
									| ForumChannel
									| ThreadChannel
									| TextChannel
								)[],
							}
						: r
				);
				setRoleIn(on, guild, updatedRoles);
			} else {
				const newRoleIn: RoleIn = {
					channels: channels as (
						| CategoryChannel
						| ForumChannel
						| ThreadChannel
						| TextChannel
					)[],
					role: role as Role,
				};
				allRoleIn.push(newRoleIn);
				setRoleIn(on, guild, allRoleIn);
			}

			// Build the final message with all selected channels grouped by type
			const channelsByType = {
				categories: channels.filter((c) => c.type === ChannelType.GuildCategory),
				forums: channels.filter((c) => c.type === ChannelType.GuildForum),
				textChannels: channels.filter((c) => c.type === ChannelType.GuildText),
				threads: channels.filter(
					(c) =>
						c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread
				),
			};

			const channelLines: string[] = [];
			for (const category of channelsByType.categories) {
				channelLines.push(`- [${ul("common.category")}] ${category.name}`);
			}
			for (const channel of channelsByType.textChannels) {
				channelLines.push(`- [${ul("common.channel")}] ${channelMention(channel.id)}`);
			}
			for (const thread of channelsByType.threads) {
				channelLines.push(`- [${ul("common.thread")}] ${channelMention(thread.id)}`);
			}
			for (const forum of channelsByType.forums) {
				channelLines.push(`- [${ul("common.forum")}] ${channelMention(forum.id)}`);
			}

			const translationOn = ul(`roleIn.on.${on}`);
			const finalMessage = `Le rôle ${mention} sera maintenant ${translationOn} dans :\n${channelLines.join("\n")}`;

			await selection.reply({
				content: finalMessage,
				ephemeral: true,
			});
		}
	} catch (e) {
		console.error(e);
		try {
			await interaction.reply({
				content: "error.failedReply",
				ephemeral: true,
			});
		} catch {
			// Interaction already acknowledged, ignore
		}
		return;
	}
}
