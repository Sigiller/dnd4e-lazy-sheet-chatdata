/**
 * libWrapper replacement for core TextEditor.implementation.enrichHTML during ActorSheet4e._prepareContext.
 * — Biography: skip enrich (raw HTML); full enrich on tab (actor-sheet-change-tab-hooks.js).
 * — Power card (detailsText): skip enrich, return raw string.
 * — Other calls: LRU (lib/enrich-html-session-cache.js) when the setting is on.
 *
 * Upstream: see actor-sheet.mjs (biography, item loop / detailsText).
 */

import { MODULE_ID } from "../constants.js";
import { isActorInSheetPrepare } from "./prep-context-marker.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { cachedEnrichCall } from "./enrich-html-session-cache.js";
import { registerLibWrapperFirst } from "./libwrapper-register.js";

/** libWrapper: target must be a descriptor string, not a function reference. */
const ENRICH_HTML_TARGETS = [
	"foundry.applications.ux.TextEditor.implementation.enrichHTML",
	"CONFIG.ux.TextEditor.implementation.enrichHTML",
	"foundry.applications.ux.TextEditor.enrichHTML"
];

function normalizeBiographyString(s) {
	return String(s ?? "")
		.replace(/\r\n/g, "\n")
		.trim();
}

function isBiographyHtml(html, actor) {
	if (!actor?.system) return false;
	const raw = actor.system.biography;
	const a = normalizeBiographyString(typeof raw === "string" ? raw : raw?.value ?? "");
	const b = normalizeBiographyString(typeof html === "string" ? html : html?.value ?? "");
	if (!a.length && !b.length) return true;
	return a === b;
}

function enrichHtmlWrapper(wrapped, html, options = {}) {
	if (!game.settings?.get(MODULE_ID, "enabled")) {
		return wrapped.call(this, html, options);
	}

	const rel = options?.relativeTo;
	if (!rel || !isLazyOptimizationActor(rel) || !isActorInSheetPrepare(rel)) {
		return cachedEnrichCall(wrapped, this, html, options);
	}

	const lazyBio = game.settings.get(MODULE_ID, "lazyBiographyPrep");
	const lazyPower = game.settings.get(MODULE_ID, "lazyPowerCardPrepEnrich");

	if (lazyBio && isBiographyHtml(html, rel)) {
		return html;
	}

	if (lazyPower && typeof html === "string" && !isBiographyHtml(html, rel)) {
		return html;
	}

	return cachedEnrichCall(wrapped, this, html, options);
}

export function registerPrepSkipEnrichHtml() {
	const impl = foundry.applications.ux?.TextEditor?.implementation;
	if (!impl?.enrichHTML) return;

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
