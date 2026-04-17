/**
 * LRU for enrichHTML results (no separate libWrapper registration).
 * Invoked from prep-skip-enrich-html.js in one wrapper chain.
 * Upstream: shared cache in TextEditor or at system level.
 */

import { MODULE_ID } from "../constants.js";

const MAX = 120;
/** @type {Map<string, { html: string, t: number }>} */
const cache = new Map();

function hashInput(s) {
	const str = typeof s === "string" ? s : JSON.stringify(s);
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16);
}

function cacheKey(html, options) {
	const rel = options?.relativeTo;
	const id = rel?.id ?? "nor";
	const sec = options?.secrets ? "1" : "0";
	return `${id}:${sec}:${hashInput(html)}:${String(html).length}`;
}

function prune() {
	if (cache.size <= MAX) return;
	let oldestKey = null;
	let oldestT = Infinity;
	for (const [k, v] of cache) {
		if (v.t < oldestT) {
			oldestT = v.t;
			oldestKey = k;
		}
	}
	if (oldestKey) cache.delete(oldestKey);
}

/**
 * @param {function} wrapped — next enrichHTML in the libWrapper chain (usually original)
 * @param {unknown} thisArg
 */
export async function cachedEnrichCall(wrapped, thisArg, html, options) {
	if (!game.settings?.get(MODULE_ID, "enabled") || !game.settings.get(MODULE_ID, "enrichHtmlSessionCache")) {
		return wrapped.call(thisArg, html, options);
	}
	if (typeof html !== "string") {
		return wrapped.call(thisArg, html, options);
	}

	const key = cacheKey(html, options);
	const hit = cache.get(key);
	if (hit) {
		hit.t = performance.now();
		return hit.html;
	}

	const out = await wrapped.call(thisArg, html, options);
	const outStr = typeof out === "string" ? out : String(out ?? "");
	cache.set(key, { html: outStr, t: performance.now() });
	prune();
	return out;
}
