/** biome-ignore-all lint/style/useNamingConvention: Discord API doesn't respect specs */
import * as Djs from "discord.js";
import db from "../database";
import { cmdLn, getUl, t } from "../i18n";
import { type TChannel, TIMEOUT, type Translation } from "../interfaces";
import {
	channelSelectorsForType,
	createRoleSelectModal,
	extractAndValidateRoleOption,
	processRoleTypeChanges,
	removeRoleIn,
	roleInSelectorsForType,
} from "../menus";
import { getCommandId } from "../utils";
import { mapToStr } from "./index";
import "../discord_ext.js";
import "uniformize";

export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("follow.title")
		.setDescriptions("follow.description")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageThreads)
		.setContexts(Djs.InteractionContextType.Guild)

		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.channel")
				.setDescriptions("follow.thread.description")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescriptions("select.type")
						.setChoices(
							{
								name: t("common.channel"),
								name_localizations: cmdLn("common.channel"),
								value: "channel",
							},
							{
								name: t("common.thread"),
								name_localizations: cmdLn("common.thread"),
								value: "thread",
							},
							{
								name: t("common.category"),
								name_localizations: cmdLn("common.category"),
								value: "category",
							},
							{
								name: t("common.forum"),
								name_localizations: cmdLn("common.forum"),
								value: "forum",
							}
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.role").setDescriptions("follow.role.description")
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.list").setDescriptions("follow.list.description")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.roleIn")
				.setDescriptions("follow.roleIn.description")
				.addRoleOption((option) =>
					option
						.setNames("common.role")
						.setDescriptions("follow.role.description")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescriptions("select.type")
						.setChoices(
							{
								name: t("common.channel"),
								name_localizations: cmdLn("common.channel"),
								value: "channel",
							},
							{
								name: t("common.thread"),
								name_localizations: cmdLn("common.thread"),
								value: "thread",
							},
							{
								name: t("common.category"),
								name_localizations: cmdLn("common.category"),
								value: "category",
							},
							{
								name: t("common.forum"),
								name_localizations: cmdLn("common.forum"),
								value: "forum",
							},
							{
								name: t("common.delete"),
								name_localizations: cmdLn("common.delete"),
								value: "delete",
							}
						)
						.setRequired(true)
				)
		),
	async execute(interaction: Djs.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild.id;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const ul = getUl(interaction);

		switch (commands) {
			case t("common.channel").toLowerCase(): {
				if (!db.settings.get(guild, "configuration.followOnlyChannel")) {
					await interaction.reply({
						content: ul("follow.error.followChannel", {
							id: await getCommandId("ignore", interaction.guild),
						}),
					});
					return;
				}
				const channelType = options.getString("type", true) as TChannel;
				await channelSelectorsForType({ channelType, interaction, mode: "follow", ul });
				break;
			}
			case t("common.role").toLowerCase():
				if (!db.settings.get(guild, "configuration.followOnlyRole")) {
					await interaction.reply({
						content: ul("follow.error.role", {
							id: await getCommandId("ignore", interaction.guild),
						}),
					});
					return;
				}
				await followThisRole(interaction, ul);
				break;
			case t("common.list"):
				await displayFollowed(interaction, ul);
				break;
			case t("common.roleIn"): {
				const opt = options.getString("type", true);
				if (opt === "delete") {
					await removeRoleIn(options, guild, "follow", interaction, ul);
					return;
				}
				const roleId = extractAndValidateRoleOption(options);
				if (!roleId) {
					await interaction.reply({
						content: ul("ignore.role.error", { role: "Unknown" }),
						flags: Djs.MessageFlags.Ephemeral,
					});
					return;
				}
				const channelType = options.getString("type", true) as TChannel;
				await roleInSelectorsForType(interaction, ul, channelType, "follow", roleId);
				break;
			}
			default:
				await displayFollowed(interaction, ul);
				break;
		}
	},
};

/**
 * Display the list of the followed channels.
 * Display the embed based on the configuration:
 * - Followed categories if the CommandName.followOnlyChannel is true
 * - Followed roles if the CommandName.followOnlyRole is true
 * - Followed roles in chan
 */
async function displayFollowed(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;
	const guildID = interaction.guild.id;
	const followed = mapToStr("follow", guildID);
	const {
		rolesNames: followedRolesNames,
		categoriesNames: followedCategoriesNames,
		threadsNames: followedThreadsNames,
		channelsNames: followedChannelsNames,
		rolesInNames: followedRolesInNames,
		forumNames: followedForumNames,
	} = followed;
	let embed: Djs.EmbedBuilder;
	if (db.settings.get(guildID, "configuration.followOnlyChannel")) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.title"))
			.addFields({
				name: ul("common.category"),
				value: followedCategoriesNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.thread"),
				value: followedThreadsNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.channel"),
				value: followedChannelsNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.forum"),
				value: followedForumNames || ul("common.none"),
			});
		if (db.settings.get(guildID, "configuration.followOnlyRole")) {
			embed.addFields({
				name: ul("common.role").toTitle(),
				value: followedRolesNames || ul("common.none"),
			});
		}
	} else if (db.settings.get(guildID, "configuration.followOnlyRole")) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.title"))
			.setDescription(followedRolesNames || ul("common.none"));
	} else if (db.settings.get(guildID, "configuration.followOnlyRoleIn")) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("follow.list.roleIn"))
			.setDescription(followedRolesInNames || ul("common.none"));
	} else {
		embed = new Djs.EmbedBuilder().setColor("#2f8e7d").setTitle(ul("common.disabled"));
	}

	await interaction.reply({
		embeds: [embed],
	});
}

/**
 * Follow-unfollow a role via modal
 */
async function followThisRole(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const followedRoleIds = db.settings.get(guildID, "follow.role") ?? [];
	const followedRoles = followedRoleIds
		.map((id) => interaction.guild!.roles.cache.get(id))
		.filter((r): r is Djs.Role => r !== undefined);
	const modal = createRoleSelectModal("follow", ul, followedRoles);

	const collectorFilter = (i: Djs.ModalSubmitInteraction) => {
		return i.user.id === interaction.user.id;
	};

	try {
		await interaction.showModal(modal);

		const selection = await interaction.awaitModalSubmit({
			filter: collectorFilter,
			time: TIMEOUT,
		});

		const newRoles = selection.fields.getSelectedRoles("select_roles", false);
		const messages: string[] = [];

		processRoleTypeChanges(
			guildID,
			"follow",
			followedRoles,
			Array.from((newRoles ?? new Map()).values()) as Djs.Role[],
			ul,
			messages
		);

		const finalMessage =
			messages.length > 0
				? `- ${messages.join("\n- ")}`
				: ul("follow.thread.noSelection");

		await selection.reply({
			content: finalMessage,
			flags: Djs.MessageFlags.Ephemeral,
		});
	} catch (e) {
		console.warn(e);
		try {
			await interaction.reply({
				content: ul("error.failedReply"),
				flags: Djs.MessageFlags.Ephemeral,
			});
		} catch {
			// Interaction already acknowledged, ignore
		}
		return;
	}
}
