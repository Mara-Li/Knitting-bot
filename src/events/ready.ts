import process from "node:process";
import type { Client } from "discord.js";
import dotenv from "dotenv";
import { commands } from "../commands";
import { VERSION } from "../index";

let config = dotenv.config({ path: ".env", quiet: true }).parsed;
if (process.env.ENV === "production") {
	config = dotenv.config({ path: ".env.prod", quiet: true }).parsed;
}

export default (client: Client): void => {
	client.on("clientReady", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) return;

		console.info(`${client.user.username} is online; v.${VERSION}`);
		const serializedCommands = commands.map((command) => command.data.toJSON());

		// ID application (priorité à process.env, fallback sur fichier .env/*.prod)
		const applicationId = process.env.CLIENT_ID || config?.CLIENT_ID;
		if (!applicationId) {
			console.error("CLIENT_ID manquant: impossible d'enregistrer les commandes.");
			return;
		}

		// Préparation des promesses pour chaque guilde
		const guilds = Array.from(client.guilds.cache.values());
		if (guilds.length === 0) {
			console.info("Aucune guilde détectée, rien à enregistrer.");
			return;
		}

		console.info(`Enregistrement des commandes sur ${guilds.length} guildes...`);

		const guildPromises = guilds.map(async (guild) => {
			try {
				console.info(`[${guild.name}] Synchronisation des commandes...`);
				// L'appel REST écrase l'ensemble des commandes guild pour cette application.
				await guild.commands.set(serializedCommands);
				console.info(`[${guild.name}] OK (${serializedCommands.length} commandes).`);
			} catch (error) {
				console.error(
					`[${guild.name}] Échec lors de l'enregistrement des commandes:`,
					error
				);
			}
		});

		// Exécuter toutes les promesses en parallèle
		await Promise.all(guildPromises);
		console.info("Toutes les guildes ont été traitées.");
	});
};
