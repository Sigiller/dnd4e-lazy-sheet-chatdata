/**
 * Snapshot of the module's world settings for the duration of one _prepareContext.
 *
 * `game.settings.get` is a collection lookup plus a JSON.parse of the stored value. The lazy
 * paths read the same flags once per item / per enrichHTML call, so a 200-item sheet used to
 * run >1000 of them per open. Read them once per prep instead; outside prep the accessors
 * fall back to live reads.
 */

import { MODULE_ID } from "../constants.js";

/** World settings read on the prep hot path. */
const KEYS = [
	"enabled",
	"enrichOnExpand",
	"deferCollapsedRowChatData",
	"lazyBiographyPrep",
	"lazyPowerCardPrepEnrich",
	"deferOffTabItemChatPrep",
	"enrichHtmlSessionCache"
];

/** @typedef {Record<(typeof KEYS)[number], boolean>} LazySettings */

/** @returns {LazySettings} */
export function readLazySettings() {
	const out = /** @type {LazySettings} */ ({});
	for (const key of KEYS) out[key] = game.settings?.get(MODULE_ID, key) === true;
	return out;
}

let depth = 0;
/** @type {LazySettings | null} */
let snapshot = null;

/**
 * Enter a prep pass. Nested/concurrent preps share the snapshot (the flags are world-scoped,
 * so they are identical for every sheet) and only the outermost pass refreshes it.
 * @returns {LazySettings}
 */
export function beginLazyPrep() {
	if (depth++ === 0) snapshot = readLazySettings();
	return snapshot;
}

export function endLazyPrep() {
	if (--depth <= 0) {
		depth = 0;
		snapshot = null;
	}
}

/** Snapshot during prep, live values outside it. @returns {LazySettings} */
export function lazySettings() {
	return snapshot ?? readLazySettings();
}
