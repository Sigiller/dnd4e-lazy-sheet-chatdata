/** Items that must bypass lazy stub/fast paths (chat roll, toChat, explicit expand). */
const forceFullChatDataItems = new WeakSet();

/** @param {Item} item */
export function isForceFullChatData(item) {
	return forceFullChatDataItems.has(item);
}

/**
 * @param {Item} item
 * @param {() => Promise<unknown> | unknown} fn
 */
export async function withForceFullChatData(item, fn) {
	forceFullChatDataItems.add(item);
	try {
		return await fn();
	} finally {
		forceFullChatDataItems.delete(item);
	}
}
