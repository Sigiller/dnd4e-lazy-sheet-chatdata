/**
 * libWrapper replacement for core TextEditor.implementation.enrichHTML during ActorSheet4e._prepareContext.
 * — Biography: skip enrich (raw HTML); full enrich on tab (actor-sheet-change-tab-hooks.js).
 * — Power card (detailsText) and item descriptions: skip enrich, return the raw string.
 *   Rows that render expanded are enriched after paint (render-lazy-rows.js).
 * — Other calls: LRU (lib/enrich-html-session-cache.js) when the setting is on.
 *
 * Upstream: see actor-sheet.mjs (biography, item loop / detailsText).
 */

import { isActorInSheetPrepare } from "./prep-context-marker.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { cachedEnrichCall } from "./enrich-html-session-cache.js";
import { registerLibWrapperFirst } from "./libwrapper-register.js";
import { isForceFullEnrich } from "./force-full-chatdata.js";
import { lazySettings } from "./lazy-prep-settings.js";

/** libWrapper: target must be a descriptor string, not a function reference. */
const ENRICH_HTML_TARGETS = [
	"foundry.applications.ux.TextEditor.implementation.enrichHTML",
	"CONFIG.ux.TextEditor.implementation.enrichHTML",
	"foundry.applications.ux.TextEditor.enrichHTML"
];

function normalize(s) {
	return String(s ?? "")
		.replace(/\r\n/g, "\n")
		.trim();
}

/** @param {Actor} actor */
function rawBiography(actor) {
	const raw = actor.system?.biography;
	return typeof raw === "string" ? raw : raw?.value ?? "";
}

/**
 * The normalized biography, memoized per actor. Without this the comparison below re-copies and
 * re-trims the whole biography once per item on every sheet open.
 * @type {WeakMap<Actor, { src: string, normalized: string }>}
 */
const normalizedBiographies = new WeakMap();

/** @param {Actor} actor */
function normalizedBiography(actor) {
	const src = rawBiography(actor);
	const hit = normalizedBiographies.get(actor);
	if (hit && hit.src === src) return hit.normalized;
	const normalized = normalize(src);
	normalizedBiographies.set(actor, { src, normalized });
	return normalized;
}

function isBiographyHtml(html, actor) {
	if (!actor?.system) return false;
	// Identity first: the sheet passes context.system.biography straight through.
	if (typeof html === "string" && html === rawBiography(actor)) return true;
	const a = normalizedBiography(actor);
	const b = normalize(typeof html === "string" ? html : html?.value ?? "");
	if (!a.length && !b.length) return true;
	return a === b;
}

/**
 * @this {unknown}
 * @param {function} wrapped
 */
function enrichHtmlWrapper(wrapped, html, options = {}) {
	const settings = lazySettings();
	if (!settings.enabled) return wrapped.call(this, html, options);

	const rel = options?.relativeTo;
	const inPrep =
		rel && isLazyOptimizationActor(rel) && isActorInSheetPrepare(rel) && !isForceFullEnrich(rel);

	if (inPrep) {
		const { lazyBiographyPrep, lazyPowerCardPrepEnrich } = settings;
		if (typeof html === "string") {
			// Default (both on): every string is deferred, so skip the biography comparison entirely.
			if (lazyBiographyPrep && lazyPowerCardPrepEnrich) return html;
			if (lazyBiographyPrep && isBiographyHtml(html, rel)) return html;
			if (lazyPowerCardPrepEnrich && !isBiographyHtml(html, rel)) return html;
		} else if (lazyBiographyPrep && isBiographyHtml(html, rel)) {
			return html;
		}
	}

	return cachedEnrichCall(wrapped, this, html, options, settings);
}

export function registerPrepSkipEnrichHtml() {
	if (!foundry.applications.ux?.TextEditor?.implementation?.enrichHTML) return;

	registerLibWrapperFirst(
		"prep-skip-enrich-html",
		ENRICH_HTML_TARGETS,
		async function (wrapped, html, options = {}) {
			return enrichHtmlWrapper.call(this, wrapped, html, options);
		},
		// MIXED: biography/power-card prep may return without calling wrapped (WRAPPER would unregister us).
		{ type: libWrapper.MIXED, perf_mode: libWrapper.PERF_NORMAL }
	);
}
