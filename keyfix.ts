import db from "src/database";
import type { IgnoreFollow, RoleIn } from "./src/interfaces";

//fix OnlyRoleIn -> onlyRoleIn in follow & ignore maps

type IgnoreFollowOld = IgnoreFollow & {
	OnlyRoleIn?: RoleIn[];
};

function setEquals(a: readonly string[], b: readonly string[]): boolean {
	if (a.length !== b.length) return false;

	const sa = new Set(a);
	if (sa.size !== a.length) {
		// Si doublons dans a, on ne peut pas comparer proprement "en set"
		// (à adapter si tu veux tolérer les doublons)
	}

	for (const x of b) {
		if (!sa.has(x)) return false;
	}
	return true;
}

/**
 * Union stable: conserve l'ordre de `base`, puis ajoute les éléments de `extra`
 * qui n'existent pas déjà.
 */
function unionStable(base: readonly string[], extra: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];

	for (const x of base) {
		if (!seen.has(x)) {
			seen.add(x);
			out.push(x);
		}
	}

	for (const x of extra) {
		if (!seen.has(x)) {
			seen.add(x);
			out.push(x);
		}
	}

	return out;
}

function mergeRoleIn(oldList: RoleIn[], newList: RoleIn[]): RoleIn[] {
	const oldMap = new Map<string, RoleIn>();
	for (const o of oldList) oldMap.set(o.roleId, o);

	const result: RoleIn[] = [];

	for (const n of newList) {
		const o = oldMap.get(n.roleId);

		if (!o) {
			// roleId seulement dans new
			result.push({ roleId: n.roleId, channelIds: [...new Set(n.channelIds)] });
		} else {
			// roleId dans les deux -> union des channelIds
			const mergedChannels = unionStable(o.channelIds, n.channelIds);

			// Si tu veux aussi "un seul objet si identique", on peut le détecter,
			// mais comme on sort de toute façon mergedChannels, ça ne change pas le résultat.
			// (Je laisse la comparaison ici si tu veux t'en servir pour du logging)
			// const same = setEquals(o.channelIds, n.channelIds);

			result.push({ roleId: n.roleId, channelIds: mergedChannels });
			oldMap.delete(n.roleId);
		}
	}

	// roles restants uniquement dans old
	for (const o of oldMap.values()) {
		result.push({ roleId: o.roleId, channelIds: [...new Set(o.channelIds)] });
	}

	return result;
}


for (const [guildId, data] of db.settings.entries()) {
	const follow = data.follow
	if (follow && Object.hasOwn(follow, "OnlyRoleIn")) {
		const onlyRoleIn = (follow as IgnoreFollowOld).OnlyRoleIn
		if (!onlyRoleIn) continue;
		delete (follow as IgnoreFollowOld).OnlyRoleIn
		//fusion + prevent duplicate entries
		const existingOnlyRoleIn = follow.onlyRoleIn ?? []
		//don't forget that object in set are not equals even with same content
		
		follow.onlyRoleIn = mergeRoleIn(onlyRoleIn, existingOnlyRoleIn);
		db.settings.set(guildId, follow, "follow")
	}
	
	const ignore = data.ignore;
	if (ignore && Object.hasOwn(ignore, "OnlyRoleIn")) {
		const onlyRoleIn = (ignore as IgnoreFollowOld).OnlyRoleIn
		if (!onlyRoleIn) continue;
		delete (ignore as IgnoreFollowOld).OnlyRoleIn
		//fusion + prevent duplicate entries
		const existingOnlyRoleIn = ignore.onlyRoleIn ?? []
		//don't forget that object in set are not equals even with same content
		
		ignore.onlyRoleIn = mergeRoleIn(onlyRoleIn, existingOnlyRoleIn);
		db.settings.set(guildId, ignore, "ignore")
	}
}