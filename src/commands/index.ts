import * as djs from "discord.js";
import db from "../database";
import type { RoleIn } from "../interfaces";
import { getTrackedItems } from "../menus";
import configuration from "./config";
import dev from "./dev.js";
import follow from "./follow";
import ignore from "./ignore";
import info from "./info";
import update from "./update";

export const ALL_COMMANDS = [ignore, configuration, update, follow, info];

if (process.env.NODE_ENV !== "production") {
	ALL_COMMANDS.push(dev);
}

function mapRoleIn(followed: RoleIn[]) {
	if (!followed.length) return "/";
	return followed
		.map((roleIn) => {
			const role = roleIn.roleId;
			const channels = roleIn.channelIds
				.map((channelId) => `**${djs.channelMention(channelId)}**`)
				.join("\n  - ");
			return `\n- ${djs.roleMention(role)}:\n  - ${channels}`;
		})
		.join("");
}

function mapIds(ids: string[]) {
	if (!ids.length) return "/";
	return `\n- ${ids.map((id) => `**${djs.channelMention(id)}**`).join("\n- ")}`;
}

function mapRoleIds(roleIds: string[]) {
	if (!roleIds.length) return "/";
	return `\n- ${roleIds.map((id) => `**${djs.roleMention(id)}**`).join("\n- ")}`;
}

export function mapToStr(type: "follow" | "ignore", guildID: string) {
	const {
		categories: categoryIds,
		channels: channelIds,
		threads: threadIds,
		forums: forumIds,
		roles: roleIds,
	} = getTrackedItems(type, guildID);
	const roleIns: RoleIn[] = db.settings.get(guildID, `${type}.onlyRoleIn`) ?? [];

	const rolesInNames = mapRoleIn(roleIns);
	const categoriesNames = mapIds(categoryIds);
	const threadsNames = mapIds(threadIds);
	const channelsNames = mapIds(channelIds);
	const rolesNames = mapRoleIds(roleIds);
	const forumNames = mapIds(forumIds);
	return {
		categoriesNames,
		channelsNames,
		forumNames,
		rolesInNames,
		rolesNames,
		threadsNames,
	};
}
