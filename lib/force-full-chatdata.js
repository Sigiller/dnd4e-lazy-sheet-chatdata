/**
 * Items / actors that must bypass the lazy prep paths (chat roll, toChat).
 *
 * `Item#roll` updates the actor, which starts a sheet re-render; the roll then keeps building
 * its chat card while `actorsInSheetPrepare` is set for that actor. Without this bypass the
 * card would get a stub from getChatData and raw HTML from enrichHTML.
 *
 * Counted rather than a plain WeakSet so nested / concurrent calls do not clear the flag early.
 */

/** @type {WeakMap<Item, number>} */
const chatDataDepth = new WeakMap();
/** @type {WeakMap<Actor, number>} */
const enrichDepth = new WeakMap();

/** @param {WeakMap<object, number>} map @param {object | null} key */
function enter(map, key) {
	if (key) map.set(key, (map.get(key) ?? 0) + 1);
}

/** @param {WeakMap<object, number>} map @param {object | null} key */
function exit(map, key) {
	if (!key) return;
	const next = (map.get(key) ?? 1) - 1;
	if (next > 0) map.set(key, next);
	else map.delete(key);
}

/** @param {Item} item */
export function isForceFullChatData(item) {
	return chatDataDepth.has(item);
}

/** @param {Actor} actor */
export function isForceFullEnrich(actor) {
	return enrichDepth.has(actor);
}

/**
 * @param {Item} item
 * @param {() => Promise<unknown> | unknown} fn
 */
export async function withForceFullChatData(item, fn) {
	const actor = item?.actor ?? null;
	enter(chatDataDepth, item);
	enter(enrichDepth, actor);
	try {
		return await fn();
	} finally {
		exit(chatDataDepth, item);
		exit(enrichDepth, actor);
	}
}
