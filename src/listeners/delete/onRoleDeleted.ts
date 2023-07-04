import { Client } from "discord.js";
import { getRole, getRoleIn, setRole, setRoleIn } from "../../maps";
import { logInDev } from "../../utils";

export default (client: Client): void => {
	client.on("roleDelete", (role) => {
		const guildID = role.guild.id;
		logInDev(`Role ${role.name} deleted`);
		const isFollowed = getRole("follow", guildID).some((followed) => followed.id === role.id);
		const isIgnored = getRole("ignore", guildID).some((ignored) => ignored.id === role.id);
		const followedRoleIn = getRoleIn("follow", guildID).some((followed) => followed.role.id === role.id);
		const ignoredRoleIn = getRoleIn("ignore", guildID).some((ignored) => ignored.role.id === role.id);
		if (isFollowed) {
			logInDev(`Role ${role.name} was followed`);
			const followed = getRole("follow", guildID);
			const index = followed.findIndex((followed) => followed.id === role.id);
			followed.splice(index, 1);
			setRole("follow", guildID, followed);
		}
		if (isIgnored) {
			logInDev(`Role ${role.name} was ignored`);
			const ignored = getRole("ignore",guildID);
			const index = ignored.findIndex((ignored) => ignored.id === role.id);
			ignored.splice(index, 1);
			setRole("ignore", guildID,ignored);
		}
		if (followedRoleIn) {
			logInDev(`Role ${role.name} was followed in a channel`);
			const followed = getRoleIn("follow",guildID);
			const index = followed.findIndex((followed) => followed.role.id === role.id);
			followed.splice(index, 1);
			setRoleIn("follow",guildID, followed);
		}
		if (ignoredRoleIn) {
			logInDev(`Role ${role.name} was ignored in a channel`);
			const ignored = getRoleIn("ignore",guildID);
			const index = ignored.findIndex((ignored) => ignored.role.id === role.id);
			ignored.splice(index, 1);
			setRoleIn("ignore",guildID, ignored);
		}
	});
};
