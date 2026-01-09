import pLimit from "p-limit";

/**
 * Run an array of tasks (functions returning a Promise) with limited concurrency.
 * Returns an array of PromiseSettledResult for each task in the same order.
 */
export async function runWithConcurrency<T>(
	tasks: Array<() => Promise<T>>,
	concurrency = 5
): Promise<PromiseSettledResult<T>[]> {
	const limit = pLimit(concurrency);
	const promises = tasks.map((task) => limit(() => task()));
	return Promise.allSettled(promises);
}
