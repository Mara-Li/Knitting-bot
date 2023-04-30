import { BaseInteraction, Client } from "discord.js";
import { commands } from "../commands";

export default (client: Client): void => {
	
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		if (!interaction.isCommand()) return;

		const command = commands.find((cmd) => cmd.data.name === interaction.commandName);
		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({
				content: "There was an error while executing this command!",
				ephemeral: true,
			});
		}
	});
};
