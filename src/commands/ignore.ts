/** biome-ignore-all lint/style/useNamingConvention: Discord API doesn't respect spec */
import * as Djs from "discord.js";
import type { TChannel } from "src/interface";
import { cmdLn, getUl, t } from "../i18n";
import { CommandName, TIMEOUT, type Translation } from "../interface";
import { getConfig, getRole, getRoleIn } from "../maps";
import {
	channelSelectorsForType,
	createRoleSelectModal,
	extractAndValidateRoleOption,
	interactionRoleInChannel,
	processRoleTypeChanges,
	roleInSelectorsForType,
} from "../menus";
import { getCommandId, toTitle } from "../utils";
import { mapToStr } from "./index";
import "../discord_ext.js";
import "uniformize";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("ignore")
		.setDescriptions("ignore.description")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageThreads)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.channel")
				.setDescriptions("ignore.thread.description")
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
			subcommand.setNames("common.role").setDescriptions("ignore.role.description")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setNames("common.roleIn")
				.setDescriptions("ignore.roleIn.description")
				.addRoleOption((option) =>
					option
						.setNames("common.role")
						.setDescription("ignore.role.option")
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
							}
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setNames("common.list").setDescriptions("ignore.list.description")
		),
	async execute(interaction: Djs.ChatInputCommandInteraction) {
		if (!interaction.guild) return;
		const guild = interaction.guild.id;
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const commands = options.getSubcommand();
		const ul = getUl(interaction);

		switch (commands) {
			case t("common.channel").toLowerCase(): {
				const channelType = options.getString("type") as TChannel;
				console.log(`[ignore] Received command with type: ${channelType}`);
				await channelSelectorsForType(interaction, ul, channelType, "ignore");
				break;
			}
			case t("common.role").toLowerCase():
				if (getConfig(CommandName.followOnlyRole, guild)) {
					await interaction.reply({
						content: ul("ignore.error.followRole", {
							id: await getCommandId("follow", interaction.guild),
						}),
					});
					return;
				}
				await ignoreThisRole(interaction, ul);
				break;
			case t("common.roleIn"): {
				if (getConfig(CommandName.followOnlyRoleIn, guild)) {
					await interaction.reply({
						content: ul("ignore.error.followRoleIn", {
							id: await getCommandId("follow", interaction.guild),
						}),
					});
					return;
				}
				const roleId = await extractAndValidateRoleOption(options);
				if (!roleId) {
					await interaction.reply({
						content: ul("ignore.role.error", { role: "Unknown" }),
						flags: Djs.MessageFlags.Ephemeral,
					});
					return;
				}
				const channelType = options.getString("type") as TChannel;
				if (!channelType) {
					// Fallback vers l'ancienne interface multi-types
					await interactionRoleInChannel(interaction, "ignore");
					return;
				}
				console.log(
					`[ignore roleIn] Received command with type: ${channelType}, roleId: ${roleId}`
				);
				await roleInSelectorsForType(interaction, ul, channelType, "ignore", roleId);
				break;
			}
			case t("common.list"):
				await displayIgnored(interaction, ul);
				break;
			default:
				await displayIgnored(interaction, ul);
				break;
		}
	},
};

/**
 * Display the list of ignored channels.
 * Display the embed based on the configuration.
 */
async function displayIgnored(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;
	const guildID = interaction.guild.id;
	const ignored = mapToStr("ignore", guildID);
	const roleIn = getRoleIn("ignore", guildID);
	const {
		rolesNames: ignoredRolesNames,
		categoriesNames: ignoredCategoriesNames,
		threadsNames: ignoredThreadsNames,
		channelsNames: ignoredChannelsNames,
		rolesInNames: ignoredRolesIn,
		forumNames: ignoredForumNames,
	} = ignored;

	let embed: Djs.EmbedBuilder;
	if (getConfig(CommandName.followOnlyChannel, guildID)) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("ignore.list.title"))
			.addFields({
				name: ul("common.category"),
				value: ignoredCategoriesNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.channel"),
				value: ignoredThreadsNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.channel"),
				value: ignoredChannelsNames || ul("common.none"),
			})
			.addFields({
				name: ul("common.forum"),
				value: ignoredForumNames || ul("common.none"),
			});
		if (getConfig(CommandName.followOnlyRole, guildID)) {
			embed.addFields({
				name: ul("common.role").toTitle(),
				value: ignoredRolesNames || ul("common.none"),
			});
		}
	} else if (getConfig(CommandName.followOnlyRole, guildID)) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("ignore.list.title"))
			.setDescription(ignoredRolesNames || ul("common.none"));
	} else if (getConfig(CommandName.followOnlyRoleIn, guildID)) {
		embed = new Djs.EmbedBuilder()
			.setColor("#2f8e7d")
			.setTitle(ul("ignore.roleIn.title"))
			.setDescription(ignoredRolesIn || ul("common.none"));
	} else {
		embed = new Djs.EmbedBuilder().setColor("#2f8e7d").setTitle(ul("common.disabled"));
	}

	if (roleIn.length > 0) {
		const embed2 = new Djs.EmbedBuilder()
			.setTitle(ul("ignore.roleIn.title"))
			.setColor("#2f8e7d")
			.setDescription(ignoredRolesIn);
		await interaction.reply({
			embeds: [embed, embed2],
		});
	} else {
		await interaction.reply({
			embeds: [embed],
		});
	}
}

/**
 * Ignore-unignore a role via modal
 */
async function ignoreThisRole(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;
	const ignoredRoleIds = getRole("ignore", guildID) ?? [];
	// Résoudre les IDs en objets Role depuis le cache
	const ignoredRoles = ignoredRoleIds
		.map((id) => interaction.guild!.roles.cache.get(id))
		.filter((r): r is Djs.Role => r !== undefined);
	const modal = createRoleSelectModal("ignore", ul, ignoredRoles);

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
			"ignore",
			ignoredRoles,
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
		console.error(e);
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
