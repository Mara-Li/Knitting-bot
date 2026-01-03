import {
	type CategoryChannel,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	channelMention,
	type ForumChannel,
	Role,
	roleMention,
	type TextChannel,
	type ThreadChannel,
} from "discord.js";
import { getUl, t } from "../i18n";
import { CommandName, type RoleIn } from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";

/**
 * Follow or ignore a role for a channel, get with the interaction
 * @param interaction {@link CommandInteraction} The interaction that triggered the command. It will have all option for the command.
 * - The role is required
 * - The channel is not. If not given, the role will be deleted from the list
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
	const role = interaction.options.get(t("common.role").toLowerCase());
	const channel = interaction.options.get(t("common.channel").toLowerCase());

	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: ul("ignore.role.error", { role: role?.name }) as string,
		});
		return;
	}
	const mention = roleMention(role.role?.id ?? "");

	if (!channel) {
		//delete the role from the list
		const allRoleIn = getRoleIn(on, guild);
		const newRolesIn: RoleIn[] = allRoleIn.filter(
			(r: RoleIn) => r.role.id !== role.role?.id
		);
		setRoleIn(on, guild, newRolesIn);
		const translationOn = ul(`roleIn.on.${on}`);
		await interaction.reply({
			content: ul("roleIn.noLonger.any", {
				mention: mention,
				on: translationOn,
			}) as string,
		});
		return;
	}
	/**
	 * Get the RoleIn interface for the given role and channel
	 */
	const allRoleIn = getRoleIn(on, guild);
	//search for the role in the array
	const roleIn = allRoleIn.find((roleIn: RoleIn) => roleIn.role.id === role.role?.id);
	const oppositeRolesIn = getRoleIn(opposite, guild);
	const oppositeRoleFind = oppositeRolesIn.find(
		(roleIn: RoleIn) => roleIn.role.id === role.role?.id
	);

	/** Verify that the role is not ignored for the same channel */
	if (
		oppositeRoleFind?.channels.some(
			(chan: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) =>
				chan.id === channel.channel?.id
		)
	) {
		const translationOpposite = ul(`roleIn.on.${opposite}`);
		await interaction.reply({
			content: ul("roleIn.already", {
				channel: channelMention(channel.channel?.id ?? ""),
				mention: mention,
				opposite: translationOpposite,
			}) as string,
		});
		return;
	}
	if (roleIn) {
		/** Verify if the channel is already in the list */
		const some = roleIn.channels.some(
			(chan: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) =>
				chan.id === channel.channel?.id
		);
		if (some) {
			roleIn.channels = roleIn.channels.filter(
				(followedChannel: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) =>
					followedChannel.id !== channel.channel?.id
			);
			//save
			setRoleIn(on, guild, allRoleIn);
			await interaction.reply({
				content: ul("roleIn.noLonger.chan", {
					chan: channelMention(channel.channel?.id ?? ""),
					mention: mention,
					on: ul(`roleIn.on.${on}`),
				}) as string,
			});
			/** If the role is not followed in any channel, remove it from the list */
			if (roleIn.channels.length === 0) {
				const newRolesIn: RoleIn[] = allRoleIn.filter(
					(r: RoleIn) => r.role.id !== role.role?.id
				);
				setRoleIn(on, guild, newRolesIn);
			}
		} else {
			/** Add the channel to the list */
			roleIn.channels.push(
				channel.channel as CategoryChannel | ForumChannel | ThreadChannel | TextChannel
			);
			//save
			setRoleIn(on, guild, allRoleIn);
			await interaction.reply({
				content: ul("roleIn.enabled.chan", {
					chan: channelMention(channel.channel?.id ?? ""),
					mention: mention,
					on: ul(`roleIn.on.${on}`),
				}) as string,
			});
		}
	}
	//if not, create it
	else {
		const newRoleIn: RoleIn = {
			channels: [
				channel.channel as CategoryChannel | ForumChannel | ThreadChannel | TextChannel,
			],
			role: role.role,
		};
		allRoleIn.push(newRoleIn);
		setRoleIn(on, guild, allRoleIn);
		await interaction.reply({
			content: ul("roleIn.enabled.chan", {
				chan: channelMention(channel.channel?.id ?? ""),
				mention: mention,
				on: ul(`roleIn.on.${on}`),
			}) as string,
		});
	}
}
