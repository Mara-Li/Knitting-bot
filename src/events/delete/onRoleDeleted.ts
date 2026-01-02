import type { Client } from "discord.js";
import { getRole, getRoleIn, setRole, setRoleIn } from "../../maps";

export default (client: Client): void => {
	client.on("roleDelete", (role) => {
		const guildID = role.guild.id;
		const isFollowed = getRole("follow", guildID).some(
			(followed) => followed.id === role.id
		);
		const isIgnored = getRole("ignore", guildID).some(
			(ignored) => ignored.id === role.id
		);
		const followedRoleIn = getRoleIn("follow", guildID).some(
			(followed) => followed.role.id === role.id
		);
		const ignoredRoleIn = getRoleIn("ignore", guildID).some(
			(ignored) => ignored.role.id === role.id
		);
		if (isFollowed) {
			const followed = getRole("follow", guildID);
			const index = followed.findIndex((followed) => followed.id === role.id);
			followed.splice(index, 1);
			setRole("follow", guildID, followed);
		}
		if (isIgnored) {
			const ignored = getRole("ignore", guildID);
			const index = ignored.findIndex((ignored) => ignored.id === role.id);
			ignored.splice(index, 1);
			setRole("ignore", guildID, ignored);
		}
		if (followedRoleIn) {
			const followed = getRoleIn("follow", guildID);
			const index = followed.findIndex((followed) => followed.role.id === role.id);
			followed.splice(index, 1);
			setRoleIn("follow", guildID, followed);
		}
		if (ignoredRoleIn) {
			const ignored = getRoleIn("ignore", guildID);
			const index = ignored.findIndex((ignored) => ignored.role.id === role.id);
			ignored.splice(index, 1);
			setRoleIn("ignore", guildID, ignored);
		}
	});
};
