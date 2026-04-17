/**
 * Патч-замена для ядра: TextEditor.implementation.enrichHTML во время ActorSheet4e._prepareContext.
 * — Биография: пропуск enrich (commonReplace или сырой HTML), опционально помечаем актёра для post-idle.
 * — Карточка силы (detailsText): пропуск enrich, возврат сырой строки.
 * — Остальные вызовы: через LRU (lib/enrich-html-session-cache.js) при включённой настройке.
 *
 * Апстрим: см. отдельные участки actor-sheet.js (биография, цикл предметов / detailsText).
 */

import { MODULE_ID } from "../constants.js";
import { isActorInSheetPrepare } from "./prep-context-marker.js";
import { cachedEnrichCall } from "./enrich-html-session-cache.js";

/** Актёры, для которых биографию нужно догрузить в idle (см. post-idle-biography-enrich.js) */
export const deferredBiographyActorIds = new Set();

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

export function registerPrepSkipEnrichHtml() {
	const impl = foundry.applications.ux?.TextEditor?.implementation;
	if (!impl?.enrichHTML) return;

	try {
		libWrapper.register(
			MODULE_ID,
			impl.enrichHTML,
			async function (wrapped, html, options = {}) {
				if (!game.settings?.get(MODULE_ID, "enabled")) {
					return wrapped.call(this, html, options);
				}

				const rel = options?.relativeTo;
				if (!rel || !isActorInSheetPrepare(rel)) {
					return cachedEnrichCall(wrapped, this, html, options);
				}

				const lazyBio = game.settings.get(MODULE_ID, "lazyBiographyPrep");
				const lazyPower = game.settings.get(MODULE_ID, "lazyPowerCardPrepEnrich");

				if (lazyBio && isBiographyHtml(html, rel)) {
					if (game.settings.get(MODULE_ID, "idleBiographyAfterRender")) {
						deferredBiographyActorIds.add(rel.id);
					}
					const Helper = game.helper;
					if (Helper?.commonReplace && typeof html === "string") {
						try {
							return Helper.commonReplace(html, rel);
						} catch {
							return html;
						}
					}
					return html;
				}

				if (lazyPower && typeof html === "string" && !isBiographyHtml(html, rel)) {
					return html;
				}

				return cachedEnrichCall(wrapped, this, html, options);
			},
			libWrapper.WRAPPER,
			{ perf_mode: libWrapper.PERF_NORMAL }
		);
	} catch (e) {
		console.error(`[${MODULE_ID}] prep-skip-enrich-html`, e);
	}
}
