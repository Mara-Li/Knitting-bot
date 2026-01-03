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

	// Create modal with channel selector only (role provided via option)
	const modal = new ModalBuilder()
		.setCustomId("roleIn_modal")
		.setTitle(ul(`roleIn.on.${on}`));

	// Channel select menu
	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId("select_roleIn_channels")
		.setChannelTypes(
			ChannelType.GuildCategory,
			ChannelType.GuildText,
			ChannelType.PublicThread,
			ChannelType.PrivateThread,
			ChannelType.GuildForum
		)
		.setDefaultChannels(existingRoleIn?.channels.map((c) => c.id) ?? [])
		.setMaxValues(25)
		.setMinValues(0);

	const channelLabel = new LabelBuilder()
		.setLabel(ul("common.channel"))
		.setChannelSelectMenuComponent(channelSelect);

	modal.addLabelComponents(channelLabel);

	try {
		const collectorFilter = (i: ModalSubmitInteraction) => {
			i.deferUpdate();
			return i.user.id === interaction.user.id;
		};

		await interaction.showModal(modal);

		const selection = await interaction.awaitModalSubmit({
			filter: collectorFilter,
			time: 60_000,
		});

		const selectedChannels = selection.fields.getSelectedChannels(
			"select_roleIn_channels",
			true,
			[
				ChannelType.GuildCategory,
				ChannelType.GuildText,
				ChannelType.PublicThread,
				ChannelType.PrivateThread,
				ChannelType.GuildForum,
			]
		);

		const role = roleOpt.role;
		const channels = Array.from(selectedChannels.values());
		const mention = roleMention(role.id);
		const messages: string[] = [];

		if (channels.length === 0) {
			// No channels selected - remove the role entirely
			const newRolesIn: RoleIn[] = allRoleIn.filter((r: RoleIn) => r.role.id !== role.id);
			setRoleIn(on, guild, newRolesIn);
			const translationOn = ul(`roleIn.on.${on}`);
			messages.push(
				ul("roleIn.noLonger.any", {
					mention: mention,
					on: translationOn,
				}) as string
			);
		} else {
			// Check if role already exists
			const roleIn = allRoleIn.find((r: RoleIn) => r.role.id === role.id);
			const oldChannelIds = new Set(roleIn?.channels.map((c) => c.id) ?? []);
			const newChannelIds = new Set(channels.map((c) => c.id));

			// Find removed channels
			if (roleIn) {
				for (const oldChannel of roleIn.channels) {
					if (!newChannelIds.has(oldChannel.id)) {
						const translationOn = ul(`roleIn.on.${on}`);
						messages.push(
							ul("roleIn.noLonger.chan", {
								chan: channelMention(oldChannel.id),
								mention: mention,
								on: translationOn,
							}) as string
						);
					}
				}
			}

			// Find added channels
			for (const channel of channels) {
				if (!oldChannelIds.has(channel.id)) {
					const translationOn = ul(`roleIn.on.${on}`);
					messages.push(
						ul("roleIn.enabled.chan", {
							chan: channelMention(channel.id),
							mention: mention,
							on: translationOn,
						}) as string
					);
				}
			}

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
		}

		const finalMessage = messages.join("\n") || ul("common.error");
		await interaction.editReply({
			content: finalMessage as string,
		});
	} catch (e) {
		await interaction.editReply({
			content: "error.failedReply",
		});
		return;
	}
}
