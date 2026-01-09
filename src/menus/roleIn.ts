import * as Djs from "discord.js";
import db from "../database.js";
import type { CommandMode, RoleIn, TChannel, Translation } from "../interfaces";
import { startPaginatedChannelSelectorsFlow } from "./channel";
import { checkRoleInConstraints, validateRoleInAndSave } from "./handlers";
/**
 * Handle roleIn channel selectors with pagination for follow/ignore commands
 */
export async function roleInSelectorsForType(
	interaction: Djs.ChatInputCommandInteraction,
	ul: Translation,
	channelType: TChannel,
	mode: CommandMode,
	roleId: string
) {
	if (!interaction.guild) return;

	const guildID = interaction.guild.id;

	// Check roleIn constraints
	const isAllowed = await checkRoleInConstraints(interaction, guildID, mode, ul);
	if (!isAllowed) return;

	const allRoleIn: RoleIn[] = db.settings.get(guildID, `${mode}.OnlyRoleIn`) ?? []; //getRoleIn(mode, guildID);
	const existingRoleIn = allRoleIn.find((r) => r.roleId === roleId);

	const trackedIds = existingRoleIn?.channelIds ?? [];

	const roleLabel = Djs.roleMention(roleId);
	const summaryPrefix = `${ul("common.role")}: ${roleLabel} - ${ul(`common.${channelType}`)}`;

	await startPaginatedChannelSelectorsFlow({
		channelType,
		interaction,
		modalLabel: `${ul("common.role")}: ${ul("common.roleIn")}`,
		mode,
		onValidateCallback: (
			buttonInteraction,
			userId,
			guildID,
			channelType,
			trackedIds,
			ul,
			mode
		) =>
			validateRoleInAndSave(
				buttonInteraction,
				userId,
				guildID,
				roleId,
				channelType,
				trackedIds,
				ul,
				mode
			),
		stateKeyPrefix: `${mode}_roleIn_${roleId}_${channelType}`,
		summaryPrefix,
		trackedIds,
		ul,
	});
}
