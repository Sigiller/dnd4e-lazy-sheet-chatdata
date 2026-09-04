/**
 * LRU for enrichHTML results (no separate libWrapper registration).
 * Invoked from prep-skip-enrich-html.js in one wrapper chain.
 * Upstream: shared cache in TextEditor or at system level.
 *
 * Calls that carry `rollData` are not cached: enrichHTML resolves `@paths` and inline rolls from
 * it, so two items with identical description text but different roll data must not share an
 * entry, and hashing the whole rollData per call would cost more than it saves.
 */

const MAX = 120;
/** Insertion order is the LRU order: least-recently-used first. @type {Map<string, string>} */
const cache = new Map();

function hashInput(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16);
}

function cacheKey(html, options) {
	const id = options?.relativeTo?.id ?? "nor";
	const secrets = options?.secrets ? "1" : "0";
	return `${id}:${secrets}:${hashInput(html)}:${html.length}`;
}

function isCacheable(html, options) {
	if (typeof html !== "string") return false;
	const rollData = options?.rollData;
	return !rollData || Object.keys(rollData).length === 0;
}

/**
 * @param {function} wrapped — next enrichHTML in the libWrapper chain (usually original)
 * @param {unknown} thisArg
 * @param {import("./lazy-prep-settings.js").LazySettings} settings snapshot from the caller
 */
export async function cachedEnrichCall(wrapped, thisArg, html, options, settings) {
	if (!settings.enrichHtmlSessionCache || !isCacheable(html, options)) {
		return wrapped.call(thisArg, html, options);
	}

	const key = cacheKey(html, options);
	if (cache.has(key)) {
		const hit = cache.get(key);
		cache.delete(key);
		cache.set(key, hit); // move to most-recently-used
		return hit;
	}

	const out = await wrapped.call(thisArg, html, options);
	if (typeof out !== "string") return out;

	cache.set(key, out);
	if (cache.size > MAX) cache.delete(cache.keys().next().value);
	return out;
}
