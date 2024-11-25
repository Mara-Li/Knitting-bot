import {
	type CategoryChannel,
	type CommandInteraction,
	type ForumChannel,
	Role,
	type TextChannel,
	type ThreadChannel,
	channelMention,
	roleMention,
} from "discord.js";
import { default as i18next } from "../i18n/init";
import { CommandName, type RoleIn } from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";

const en = i18next.getFixedT("en");

/**
 * Follow or ignore a role for a channel, get with the interaction
 * @param interaction {@link CommandInteraction} The interaction that triggered the command. It will have all option for the command.
 * - The role is required
 * - The channel is not. If not given, the role will be deleted from the list
 * @param on {"follow" | "ignore"} The mode to use
 */
export async function interactionRoleInChannel(
	interaction: CommandInteraction,
	on: "follow" | "ignore",
) {
	const opposite = on === "follow" ? "ignore" : "follow";
	if (!interaction.guild) return;
	const guild = interaction.guild.id;
	if (
		on === "follow" &&
		(getConfig(CommandName.followOnlyChannel, guild) ||
			getConfig(CommandName.followOnlyRole, guild))
	) {
		await interaction.reply({
			content: i18next.t("roleIn.error.otherMode") as string,
			ephemeral: true,
		});
		return;
	}
	if (!getConfig(CommandName.followOnlyRoleIn, guild) && on === "follow") {
		await interaction.reply({
			content: i18next.t("roleIn.error.need") as string,
			ephemeral: true,
		});
		return;
	}
	const role = interaction.options.get(en("common.role").toLowerCase());
	const channel = interaction.options.get(en("common.channel").toLowerCase());

	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", { role: role?.name }) as string,
			ephemeral: true,
		});
		return;
	}
	const mention = roleMention(role.role?.id ?? "");

	if (!channel) {
		//delete the role from the list
		const allRoleIn = getRoleIn(on, guild);
		const newRolesIn: RoleIn[] = allRoleIn.filter(
			(r: RoleIn) => r.role.id !== role.role?.id,
		);
		setRoleIn(on, guild, newRolesIn);
		const translationOn = i18next.t(`roleIn.on.${on}`);
		await interaction.reply({
			content: i18next.t("roleIn.noLonger.any", {
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
	const roleIn = allRoleIn.find(
		(roleIn: RoleIn) => roleIn.role.id === role.role?.id,
	);
	const oppositeRolesIn = getRoleIn(opposite, guild);
	const oppositeRoleFind = oppositeRolesIn.find(
		(roleIn: RoleIn) => roleIn.role.id === role.role?.id,
	);

	/** Verify that the role is not ignored for the same channel */
	if (
		oppositeRoleFind &&
		oppositeRoleFind.channels.some(
			(chan: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) =>
				chan.id === channel.channel?.id,
		)
	) {
		const translationOpposite = i18next.t(`roleIn.on.${opposite}`);
		await interaction.reply({
			content: i18next.t("roleIn.already", {
				mention: mention,
				opposite: translationOpposite,
				channel: channelMention(channel.channel?.id ?? ""),
			}) as string,
			ephemeral: true,
		});
		return;
	}
	if (roleIn) {
		/** Verify if the channel is already in the list */
		const some = roleIn.channels.some(
			(chan: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) =>
				chan.id === channel.channel?.id,
		);
		if (some) {
			roleIn.channels = roleIn.channels.filter(
				(
					followedChannel:
						| ForumChannel
						| CategoryChannel
						| ThreadChannel
						| TextChannel,
				) => followedChannel.id !== channel.channel?.id,
			);
			//save
			setRoleIn(on, guild, allRoleIn);
			await interaction.reply({
				content: i18next.t("roleIn.noLonger.chan", {
					mention: mention,
					on: i18next.t(`roleIn.on.${on}`),
					chan: channelMention(channel.channel?.id ?? ""),
				}) as string,
				ephemeral: true,
			});
			/** If the role is not followed in any channel, remove it from the list */
			if (roleIn.channels.length === 0) {
				const newRolesIn: RoleIn[] = allRoleIn.filter(
					(r: RoleIn) => r.role.id !== role.role?.id,
				);
				setRoleIn(on, guild, newRolesIn);
			}
		} else {
			/** Add the channel to the list */
			roleIn.channels.push(
				channel.channel as
					| CategoryChannel
					| ForumChannel
					| ThreadChannel
					| TextChannel,
			);
			//save
			setRoleIn(on, guild, allRoleIn);
			await interaction.reply({
				content: i18next.t("roleIn.enabled.chan", {
					mention: mention,
					on: i18next.t(`roleIn.on.${on}`),
					chan: channelMention(channel.channel?.id ?? ""),
				}) as string,
				ephemeral: true,
			});
		}
	}
	//if not, create it
	else {
		const newRoleIn: RoleIn = {
			role: role.role,
			channels: [
				channel.channel as
					| CategoryChannel
					| ForumChannel
					| ThreadChannel
					| TextChannel,
			],
		};
		allRoleIn.push(newRoleIn);
		setRoleIn(on, guild, allRoleIn);
		await interaction.reply({
			content: i18next.t("roleIn.enabled.chan", {
				mention: mention,
				on: i18next.t(`roleIn.on.${on}`),
				chan: channelMention(channel.channel?.id ?? ""),
			}) as string,
			ephemeral: true,
		});
	}
}
