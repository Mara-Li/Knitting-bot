import * as Djs from "discord.js";
import "../discord_ext.js";
import "uniformize";
import db from "../database";
import type { IgnoreFollowKey, ServerData } from "../interfaces";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("dev")
		.setDescription("Developer only command")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.Administrator)
		.setContexts(Djs.InteractionContextType.Guild)

		.addSubcommand((group) =>
			group
				.setName("create_bulk")
				.setDescription("Create a number of channel/thread/forum/category")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("Type of things to create")
						.setRequired(true)
						.addChoices({ name: "thread", value: "thread" })
						.addChoices({ name: "channel", value: "channel" })
						.addChoices({ name: "forum", value: "forum" })
						.addChoices({ name: "category", value: "category" })
				)
				.addNumberOption((option) =>
					option
						.setName("number")
						.setDescription("Number of threads to create")
						.setRequired(true)
						.setMinValue(1)
				)
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription(
							"Base name for the created items, use i for numbering and type for the type"
						)
						.setRequired(false)
				)
		)
		.addSubcommand((group) =>
			group
				.setName("clear")
				.setDescription("Clear the DB")
				.addStringOption((option) =>
					option
						.setName("type")
						.setDescription("Type of things to clear")
						.setRequired(true)
						.addChoices({ name: "all", value: "all" })
						.addChoices({ name: "follow", value: "follow" })
						.addChoices({ name: "ignore", value: "ignore" })
						.addChoices({ name: "messageCache", value: "messageCache" })
				)
				.addStringOption((option) =>
					option
						.setName("item_type")
						.setDescription("Item type to clear")
						.setRequired(false)
						.addChoices({ name: "channel", value: "channel" })
						.addChoices({ name: "thread", value: "thread" })
						.addChoices({ name: "forum", value: "forum" })
						.addChoices({ name: "category", value: "category" })
						.addChoices({ name: "role", value: "role" })
				)
		)
		.addSubcommand((sub) =>
			sub
				.setName("db_view")
				.setDescription("View the current server's DB entry")
				.addStringOption((input) =>
					input.setName("key").setDescription("Specific key to view").setRequired(true)
				)
		),
	async execute(interaction: Djs.ChatInputCommandInteraction) {
		if (!interaction.guild) {
			await interaction.reply("This command can only be used in a server.");
			return;
		}
		if (
			interaction.user.id !== process.env.ADMIN ||
			interaction.guild?.id !== process.env.TEST_SERV
		) {
			await interaction.reply({
				content: "You are not authorized to use this command.",
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		if (interaction.options.getSubcommand() === "create_bulk") {
			await interaction.deferReply();
			const number = interaction.options.getNumber("number", true);
			const type = interaction.options.getString("type", true);
			const name = interaction.options.getString("name") || `${type}-i`;

			const channel = interaction.channel;
			if (
				!channel ||
				!channel.isTextBased() ||
				channel.isDMBased() ||
				channel.isVoiceBased() ||
				channel.isThread()
			) {
				await interaction.editReply({
					content: "This command can only be used in a text channel.",
				});
				return;
			}
			const format = detectFormatFromName(name);
			const now = Date.now();
			for (let i = 0; i < number; i++) {
				const nameIndexed = name
					.replace("i", `${i + 1}`)
					.replace("type", type)
					.replace(/\{date::(.*?)\}/i, formatDate(now, format));
				if (type === "channel") {
					await interaction.guild!.channels.create({
						name: nameIndexed,
						type: Djs.ChannelType.GuildText,
					});
				} else if (type === "forum") {
					await interaction.guild!.channels.create({
						name: nameIndexed,
						type: Djs.ChannelType.GuildForum,
					});
				} else if (type === "category") {
					await interaction.guild!.channels.create({
						name: nameIndexed,
						type: Djs.ChannelType.GuildCategory,
					});
				} else if (type === "thread") {
					await channel.threads.create({
						autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneHour,
						name: nameIndexed,
					});
				}
				//sleep for 1 second to avoid rate limit
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			await interaction.editReply(`${number} ${type} created.`);
			return;
		}
		if (interaction.options.getSubcommand() === "clear") {
			await interaction.deferReply();
			const itemType = interaction.options.getString("item_type");
			const type = interaction.options.getString("type", true);
			const guildID = interaction.guild.id;
			if (type === "all") db.settings.delete(guildID);
			else if (type === "messageCache") {
				db.settings.set(guildID, {}, "messageCache");
			} else if (itemType) {
				if (type === "follow")
					db.settings.set(guildID, [], `follow.${itemType as IgnoreFollowKey}`);
				else if (type === "ignore")
					db.settings.set(guildID, [], `ignore.${itemType as IgnoreFollowKey}`);
			} else {
				db.settings.delete(guildID, type as keyof ServerData);
			}
			await interaction.editReply(
				`Cleared ${type} ${itemType ? `for ${itemType}` : ""}.`
			);
			return;
		}
		if (interaction.options.getSubcommand() === "db_view") {
			await interaction.deferReply();
			const key = interaction.options.getString("key", true);
			const guildID = interaction.guild.id;
			const data = db.settings.get(guildID, key as keyof ServerData);
			await interaction.editReply(
				`DB Entry for key "${key}":\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
			);
		}
	},
};

function detectFormatFromName(name: string) {
	const lowered = name.toLowerCase();
	const regex = /\{date::(.*?)\}/;
	const match = lowered.match(regex);
	if (match?.[1]) return match[1];
	return "dd/mm/yyyy";
}

function formatDate(input: Date | string | number, format = "dd/mm/YYYY"): string {
	const date = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(date.getTime())) return "";

	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();

	const map = {
		d: String(day),
		dd: String(day).padStart(2, "0"),
		m: String(month),
		mm: String(month).padStart(2, "0"),
		yy: String(year % 100).padStart(2, "0"),
		yyyy: String(year),
	} as const;
	if (format === "dd/mm/YYYY") format = "dd/mm/yyyy";

	// Replace longest tokens first; be tolerant to token case.
	return format.replace(/YYYY|YY|dd|d|mm|m/gi, (tok) => {
		const key = tok.toLowerCase() as keyof typeof map;
		return map[key] ?? tok;
	});
}
