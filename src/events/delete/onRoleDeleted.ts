import type { Client } from "discord.js";
import { getRole, getRoleIn, setRole, setRoleIn } from "../../maps";

export default (client: Client): void => {
	client.on("roleDelete", (role) => {
		const guildID = role.guild.id;

		// Remove from simple role lists
		const followedRoles = getRole("follow", guildID);
		const ignoredRoles = getRole("ignore", guildID);

		const filteredFollowed = followedRoles.filter((id) => id !== role.id);
		const filteredIgnored = ignoredRoles.filter((id) => id !== role.id);

		if (followedRoles.length !== filteredFollowed.length) {
			setRole("follow", guildID, filteredFollowed);
		}
		if (ignoredRoles.length !== filteredIgnored.length) {
			setRole("ignore", guildID, filteredIgnored);
		}

		// Remove from RoleIn lists
		const followedRoleIns = getRoleIn("follow", guildID);
		const ignoredRoleIns = getRoleIn("ignore", guildID);

		const filteredFollowedRoleIn = followedRoleIns.filter(
			(roleIn) => roleIn.roleId !== role.id
		);
		const filteredIgnoredRoleIn = ignoredRoleIns.filter(
			(roleIn) => roleIn.roleId !== role.id
		);

		if (followedRoleIns.length !== filteredFollowedRoleIn.length) {
			setRoleIn("follow", guildID, filteredFollowedRoleIn);
		}
		if (ignoredRoleIns.length !== filteredIgnoredRoleIn.length) {
			setRoleIn("ignore", guildID, filteredIgnoredRoleIn);
		}
	});
};
