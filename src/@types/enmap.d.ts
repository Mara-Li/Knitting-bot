import "enmap";

declare module "enmap" {
	export interface EnmapOptions {
		inMemory?: boolean;
	}

	export interface Enmap<K, V> {
		inMemory: boolean;
	}
}
