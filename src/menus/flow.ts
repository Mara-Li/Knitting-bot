import * as Djs from "discord.js";
import db from "../database";
import { type PaginatedHandlers, TIMEOUT, type Translation } from "../interfaces";
import { deletePaginationState } from "./state";

export function hasMorePages(
	paginatedItems: Record<number, string[]>,
	page = 0
): boolean {
	return Object.keys(paginatedItems).length > page + 1;
}

export async function startPaginatedButtonsFlow(
	params: {
		interaction:
			| Djs.ChatInputCommandInteraction
			| Djs.ButtonInteraction
			| Djs.ModalSubmitInteraction;
		userId: string;
		ul: Translation;
		initialContent: string;
		initialComponents: Djs.ActionRowBuilder<Djs.ButtonBuilder>[];
		timeout?: number;
		stateKey?: string; // optional key to link this message to a PaginationState
	},
	handlers: PaginatedHandlers
) {
	const {
		interaction,
		userId,
		ul,
		initialContent,
		initialComponents,
		timeout,
		stateKey,
	} = params;
	const t = timeout ?? TIMEOUT;

	await interaction.reply({
		components: initialComponents,
		content: initialContent,
	});

	const buttonMessage = await interaction.fetchReply();
	if (stateKey && buttonMessage.id) {
		// link the message ID to the state key
		db.messageToStateKey.set(buttonMessage.id, stateKey);
	}

	const collector = buttonMessage.createMessageComponentCollector({
		componentType: Djs.ComponentType.Button,
		filter: (i: Djs.Interaction) => i.user.id === userId,
		time: t,
	});

	collector.on("collect", async (buttonInteraction) => {
		const customId = buttonInteraction.customId;

		try {
			// parse trailing integer more robustly
			const match = customId.match(/(\d+)$/);
			const parsed = match ? Number.parseInt(match[1], 10) : Number.NaN;

			if (customId.startsWith("page_modify_") || customId.includes("_page_modify_")) {
				const page = Number.isFinite(parsed) ? parsed : 0;
				await handlers.onModify(buttonInteraction, page);
			} else if (customId.startsWith("page_prev_") || customId.includes("_page_prev_")) {
				await buttonInteraction.deferUpdate();
				const current = Number.isFinite(parsed) ? parsed : 0;
				const prevPage = Math.max(0, current - 1);
				await handlers.onShowPage(buttonInteraction, prevPage);
			} else if (customId.startsWith("page_next_") || customId.includes("_page_next_")) {
				await buttonInteraction.deferUpdate();
				const current = Number.isFinite(parsed) ? parsed : 0;
				const nextPage = current + 1;
				await handlers.onShowPage(buttonInteraction, nextPage);
			} else if (customId.endsWith("_page_validate") || customId === "page_validate") {
				await buttonInteraction.deferUpdate();
				await handlers.onValidate(buttonInteraction);
				collector.stop();
			} else if (customId.endsWith("_page_cancel") || customId === "page_cancel") {
				await buttonInteraction.deferUpdate();
				if (handlers.onCancel) {
					await handlers.onCancel(buttonInteraction);
				} else {
					await buttonInteraction.editReply({
						components: [],
						content: ul("common.cancelled"),
					});
				}
				collector.stop();
			}
		} catch (e) {
			console.error("Error handling paginated button interaction:", e);
		}
	});

	collector.on("end", async () => {
		// cleanup mapping and state
		try {
			const id = (buttonMessage as Djs.Message).id;
			if (db.messageToStateKey.has(id)) db.messageToStateKey.delete(id);
			// Auto-cleanup the state when collector ends (timeout or stop)
			if (stateKey) deletePaginationState(stateKey);
		} catch (e) {
			/* noop */
		}

		// Call onEnd if provided so caller can cleanup state and remove components
		try {
			if (handlers.onEnd) await handlers.onEnd(buttonMessage);
			else await buttonMessage.edit({ components: [] });
		} catch (e) {
			console.error("Error in onEnd handler for paginated flow:", e);
		}
	});
}

export function createPaginationButtons(
	mode: "follow" | "ignore",
	page: number,
	hasMore: boolean,
	ul: (key: string) => string
) {
	const buttons = [];

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_modify_${page}`)
			.setLabel(ul("common.modify"))
			.setEmoji("✏️")
			.setStyle(Djs.ButtonStyle.Primary)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_prev_${page}`)
			.setLabel(`${ul("common.previous")}`)
			.setEmoji("◀️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setDisabled(page === 0)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_next_${page}`)
			.setLabel(`${ul("common.next")}`)
			.setEmoji("➡️")
			.setStyle(Djs.ButtonStyle.Secondary)
			.setDisabled(!hasMore)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_validate`)
			.setLabel(ul("common.validate"))
			.setEmoji("✅")
			.setStyle(Djs.ButtonStyle.Success)
	);

	buttons.push(
		new Djs.ButtonBuilder()
			.setCustomId(`${mode}_page_cancel`)
			.setLabel(ul("common.cancel"))
			.setEmoji("❌")
			.setStyle(Djs.ButtonStyle.Danger)
	);

	return [new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(buttons)];
}
