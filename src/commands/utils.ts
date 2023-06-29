import { roleMention } from "@discordjs/formatters";
import {
	CategoryChannel,
	ChannelType,
	CommandInteraction,
	ForumChannel,
	Role,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { CommandName, RoleIn } from "../interface";
import { getConfig, getRoleIn, setRoleIn } from "../maps";
import { default as i18next } from "../i18n/i18next";
import { logInDev } from "../utils";
const fr = i18next.getFixedT("fr");
const en = i18next.getFixedT("en");

/**
 * Follow a role in a channel (text or thread) the rest of the server will be "normal", so no need to activate the follow-only mode!
 * @param interaction {CommandInteraction} The interaction that triggered the command
 * @param on
 */
export async function interactionRoleInChannel(interaction: CommandInteraction, on: "follow" | "ignore") {
	const opposite = on === "follow" ? "ignore" : "follow";
	if (on === "follow" && (getConfig(CommandName.followOnlyChannel) || getConfig(CommandName.followOnlyRole))) {
		await interaction.reply({
			content: "You can't use this command with the other follow-only mode.",
			ephemeral: true,
		});
		return;
	}
	if (!getConfig(CommandName.followOnlyRoleIn) && on === "follow") {
		await interaction.reply({
			content: "You need to activate the follow-only-role-in mode first.",
			ephemeral: true,
		});
		return;
	}
	const role = interaction.options.get(en("common.role").toLowerCase());
	const channel = interaction.options.get(en("common.channel").toLowerCase()) ?? interaction;
	if (!role || !(role.role instanceof Role)) {
		await interaction.reply({
			content: i18next.t("ignore.role.error", {role: role?.name}) as string,
			ephemeral: true,
		});
		return;
	}
	const channelType = channel.channel?.type;
	logInDev("channelType", channelType as ChannelType);
	const validChannelTypes : ChannelType[] = [ChannelType.GuildCategory, ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildForum];
	logInDev("validChannelTypes", validChannelTypes);
	logInDev(validChannelTypes.includes(channelType ?? 99));
	if (!validChannelTypes.includes(channelType ?? 99)) {
		await interaction.reply({
			content: "This channel type is not supported",
			ephemeral: true,
		});
	}
	/**
	 * Get the RoleIn interface for the given role and channel
	 */
	const allRoleIn = getRoleIn(on);
	//search for the role in the array
	const roleIn = allRoleIn.find(
		(roleIn: RoleIn) =>
			roleIn.role.id === role.role?.id
	);
	const oppositeRolesIn = getRoleIn(opposite);
	const oppositeRoleFind = oppositeRolesIn.find(
		(roleIn: RoleIn) => roleIn.role.id === role.role?.id
	);
	
	const mention = roleMention(role.role?.id ?? "");
	/** Verify that the role is not ignored for the same channel */
	if (oppositeRoleFind && oppositeRoleFind.channels.some(
		(chan: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) => chan.id === channel.channel?.id
	)) {
		await interaction.reply({
			content: "The role " + mention + " is already " + opposite + " in " + channel.channel?.toString(),
			ephemeral: true,
		});
		return;
	}
	if (roleIn) {
		/** Verify if the channel is already in the list */
		const some = roleIn.channels.some(
			(chan: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) => chan.id === channel.channel?.id
		);
		if (some) {
			roleIn.channels = roleIn.channels.filter(
				(followedChannel: ForumChannel | CategoryChannel | ThreadChannel | TextChannel) => followedChannel.id !== channel.channel?.id
			);
			//save
			setRoleIn(on, allRoleIn);
			await interaction.reply({
				content: "The role " + mention + " is no longer " + on + " in " + channel.channel?.toString(),
				ephemeral: true,
			});
			/** If the role is not followed in any channel, remove it from the list */
			if (roleIn.channels.length === 0) {
				const newRolesIn: RoleIn[] = allRoleIn.filter(
					(r: RoleIn) => r.role.id !== role.role?.id
				);
				setRoleIn(on, newRolesIn);
			}
		} else {
			/** Add the channel to the list */
			roleIn.channels.push(channel.channel as CategoryChannel | ForumChannel | ThreadChannel | TextChannel);
			//save
			setRoleIn(on, allRoleIn);
			await interaction.reply({
				content: "The role " + mention + " is now "+ on +" in " + channel.channel?.toString(),
				ephemeral: true,
			});
		}
		
	}
	//if not, create it
	else {
		const newRoleIn: RoleIn = {
			role: role.role,
			channels: [channel.channel as CategoryChannel | ForumChannel | ThreadChannel | TextChannel],
		};
		allRoleIn.push(newRoleIn);
		setRoleIn(on, allRoleIn);
		await interaction.reply({
			content: "The role " + mention + " is now " + on + " in " + channel.channel?.toString(),
			ephemeral: true,
		});
	}
}
