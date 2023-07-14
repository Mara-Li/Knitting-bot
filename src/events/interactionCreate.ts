import { BaseInteraction, Client } from "discord.js";
import { commands } from "../commands";
import { default as i18next } from "../i18n/i18next";

export default (client: Client): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		if (!interaction.isCommand()) return;

		const command = commands.find(
			(cmd) => cmd.data.name === interaction.commandName
		);
		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.log(error);
			await interaction.channel?.send({
				content: i18next.t("common.error", { error: error }) as string,
			});
		}
	});
};
