import "../discord_ext.js";
import "uniformize";
import * as Djs from "discord.js";
import dotenv from "dotenv";

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
				if (type === "channel") {
					await interaction.guild!.channels.create({
						name: `channel-${i + 1}`,
						type: Djs.ChannelType.GuildText,
					});
				} else if (type === "forum") {
					await interaction.guild!.channels.create({
						name: `forum-${i + 1}`,
						type: Djs.ChannelType.GuildForum,
					});
				} else if (type === "category") {
					await interaction.guild!.channels.create({
						name: `category-${i + 1}`,
						type: Djs.ChannelType.GuildCategory,
					});
				} else if (type === "thread") {
					await channel.threads.create({
						autoArchiveDuration: Djs.ThreadAutoArchiveDuration.OneHour,
						name: `Thread - ${i + 1}`,
					});
				}
				//sleep for 1 second to avoid rate limit
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
			await interaction.editReply(`${number} ${type} created.`);
			return;
		}
	},
};
