import { Client } from "discord.js";
import { getFollow, getIgnored, setFollow, TypeName } from "../../maps";
import { logInDev } from "../../utils";

export default (client: Client): void => {
	client.on("roleDelete", (role) => {
		logInDev(`Role ${role.name} deleted`);
		const isFollowed = getFollow(TypeName.role).some((followed) => followed.id === role.id);
		const isIgnored = getIgnored(TypeName.role).some((ignored) => ignored.id === role.id);
		if (isFollowed) {
			logInDev(`Role ${role.name} was followed`);
			const followed = getFollow(TypeName.role);
			const index = followed.findIndex((followed) => followed.id === role.id);
			followed.splice(index, 1);
			setFollow(TypeName.role, followed);
		}
		if (isIgnored) {
			logInDev(`Role ${role.name} was ignored`);
			const ignored = getIgnored(TypeName.role);
			const index = ignored.findIndex((ignored) => ignored.id === role.id);
			ignored.splice(index, 1);
			setFollow(TypeName.role, ignored);
		}
	});
};
