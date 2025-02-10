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
			const role = roleIn.role.id;
			const channels = roleIn.channels
				.map((channel) => `**${djs.channelMention(channel.id)}**`)
				.join("\n  - ");
			return `\n- ${djs.roleMention(role)}:\n  - ${channels}`;
		})
		.join("");
}

function mapChannel(
	toMaps:
		| djs.CategoryChannel[]
		| djs.ThreadChannel[]
		| djs.TextChannel[]
		| djs.ForumChannel[],
) {
	if (!toMaps.length) return "/";
	return `\n- ${toMaps
		.map((category) => `**${djs.channelMention(category.id)}**`)
		.join("\n- ")}\`;`;
}

function mapRole(roles: djs.Role[]) {
	if (!roles.length) return "/";
	return `\n- ${roles
		.map((role) => `**${djs.roleMention(role.id)}**`)
		.join("\n- ")}\`;`;
}

export function mapToStr(type: "follow" | "ignore", guildID: string) {
	const categories =
		(getMaps(type, TypeName.category, guildID) as djs.CategoryChannel[]) ?? [];
	const threads =
		(getMaps(type, TypeName.thread, guildID) as djs.ThreadChannel[]) ?? [];
	const channels =
		(getMaps(type, TypeName.channel, guildID) as djs.TextChannel[]) ?? [];
	const forum =
		(getMaps(type, TypeName.forum, guildID) as djs.ForumChannel[]) ?? [];
	const roles = (getRole(type, guildID) as djs.Role[]) ?? [];
	const roleIns = (getRoleIn(type, guildID) as RoleIn[]) ?? [];
	const rolesInNames = mapRoleIn(roleIns);
	const categoriesNames = mapChannel(categories);
	const threadsNames = mapChannel(threads);
	const channelsNames = mapChannel(channels);
	const rolesNames = mapRole(roles);
	const forumNames = mapChannel(forum);
	return {
		rolesNames,
		categoriesNames,
		threadsNames,
		channelsNames,
		rolesInNames,
		forumNames,
	};
}
