import "../discord_ext.js";
import "uniformize";
import * as Djs from "discord.js";
import dotenv from "dotenv";
import { serverDataDb } from "../maps.js";

dotenv.config();

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("dev")
		.setDescription("Developer only command")
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.Administrator)
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
				await interaction.reply({
					content: "This command can only be used in a text channel.",
					flags: Djs.MessageFlags.Ephemeral,
				});
				return;
			}
			for (let i = 0; i < number; i++) {
				const nameIndexed = name.replace("i", `${i + 1}`).replace("type", type);
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
			console.log("BEFORE", serverDataDb.get(interaction.guild.id));
			await interaction.deferReply();
			const itemType = interaction.options.getString("item_type");
			const type = interaction.options.getString("type", true);
			const guildID = interaction.guild.id;
			if (type === "all") serverDataDb.delete(guildID);
			else if (type === "messageCache") {
				serverDataDb.set(guildID, {}, "messageCache");
			} else if (itemType) {
				if (type === "follow") serverDataDb.set(guildID, [], `follow.${itemType}`);
				else if (type === "ignore") serverDataDb.set(guildID, [], `ignore.${itemType}`);
			} else {
				serverDataDb.delete(guildID, type);
			}
			const result = serverDataDb.get(guildID);
			await interaction.editReply(
				`Cleared ${type} ${itemType ? `for ${itemType}` : ""}.`
			);
			console.log("Current DB state:", result);
		} else if (interaction.options.getSubcommand() === "db_view") {
			await interaction.deferReply();
			const key = interaction.options.getString("key", true);
			const guildID = interaction.guild.id;
			const data = serverDataDb.get(guildID, key);
			await interaction.editReply(
				`DB Entry for key "${key}":\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
			);
		}
	},
};
