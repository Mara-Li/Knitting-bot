import * as djs from "discord.js";
import { type RoleIn, TypeName } from "../interface";
import { getMaps, getRole, getRoleIn } from "../maps";
import configuration from "./config";
import follow from "./follow";
import ignore from "./ignore";
import info from "./info";
import update from "./update";

export const commands = [ignore, configuration, update, follow, info];

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
	return `\n- ${ids.map((id) => `**${djs.channelMention(id)}**`).join("\n- ")}\`;`;
}

function mapRoleIds(roleIds: string[]) {
	if (!roleIds.length) return "/";
	return `\n- ${roleIds.map((id) => `**${djs.roleMention(id)}**`).join("\n- ")}\`;`;
}

export function mapToStr(type: "follow" | "ignore", guildID: string) {
	const categoryIds = getMaps(type, TypeName.category, guildID);
	const threadIds = getMaps(type, TypeName.thread, guildID);
	const channelIds = getMaps(type, TypeName.channel, guildID);
	const forumIds = getMaps(type, TypeName.forum, guildID);
	const roleIds = getRole(type, guildID);
	const roleIns = getRoleIn(type, guildID);
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
