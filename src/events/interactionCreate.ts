import type { BaseInteraction, ChatInputCommandInteraction, Client } from "discord.js";
import { ALL_COMMANDS } from "../commands";
import { getUl } from "../i18n";

export default (client: Client): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		if (!interaction.isCommand()) return;
		const command = ALL_COMMANDS.find((cmd) => cmd.data.name === interaction.commandName);
		if (!command) return;

		try {
			await command.execute(interaction as ChatInputCommandInteraction);
		} catch (error) {
			console.log(error);
			if (!interaction.channel || interaction.channel.isDMBased()) return;
			const ul = getUl(interaction);
			await interaction.channel.send({
				content: ul("common.error", { error: error }) as string,
			});
		}
	});
};
