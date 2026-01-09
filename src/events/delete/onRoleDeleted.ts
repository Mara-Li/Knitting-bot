import type { Client } from "discord.js";
import db from "../../database";
export default (client: Client): void => {
	client.on("roleDelete", (role) => {
		const guildID = role.guild.id;

		// Remove from simple role lists
		const followedRoles = db.settings.get(guildID, "follow.role") ?? [];
		const ignoredRoles = db.settings.get(guildID, "ignore.role") ?? [];

		const filteredFollowed = followedRoles.filter((id) => id !== role.id);
		const filteredIgnored = ignoredRoles.filter((id) => id !== role.id);

		if (followedRoles.length !== filteredFollowed.length)
			db.settings.set(guildID, filteredFollowed, "follow.role");

		if (ignoredRoles.length !== filteredIgnored.length)
			db.settings.set(guildID, filteredIgnored, "ignore.role");

		// Remove from RoleIn lists
		const followedRoleIns = db.settings.get(guildID, "follow.onlyRoleIn") ?? [];
		const ignoredRoleIns = db.settings.get(guildID, "ignore.onlyRoleIn") ?? [];

		const filteredFollowedRoleIn = followedRoleIns.filter(
			(roleIn) => roleIn.roleId !== role.id
		);
		const filteredIgnoredRoleIn = ignoredRoleIns.filter(
			(roleIn) => roleIn.roleId !== role.id
		);

		if (followedRoleIns.length !== filteredFollowedRoleIn.length)
			db.settings.set(guildID, filteredFollowedRoleIn, "follow.onlyRoleIn");

		if (ignoredRoleIns.length !== filteredIgnoredRoleIn.length)
			db.settings.set(guildID, filteredIgnoredRoleIn, "ignore.onlyRoleIn");
	});
};
