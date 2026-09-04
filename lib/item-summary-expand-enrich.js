/**
 * After expanding an item row — full getChatData + DOM update (dnd4e 0.6-style on click).
 * Upstream: fold into ActorSheet4e.#onItemSummary or a dedicated hook.
 *
 * Registered by mutating DEFAULT_OPTIONS.actions rather than via libWrapper: ApplicationV2
 * dispatches actions out of the options object and #onItemSummary is private, so there is no
 * prototype method to wrap.
 */

import { MODULE_ID } from "../constants.js";
import { syncExpandedMirrorFromItemRow } from "./sheet-expanded-item-ids.js";
import { applyEnrichedItemSummary } from "./item-enriched-summary.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { readLazySettings } from "./lazy-prep-settings.js";

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
export function registerItemSummaryExpandEnrich(ActorSheet4e) {
	const orig = ActorSheet4e.DEFAULT_OPTIONS?.actions?.itemSummary;
	if (typeof orig !== "function" || orig.__dnd4eLazyExpandWrapped) return;

	const wrappedFn = async function (event, target) {
		await orig.call(this, event, target);

		const settings = readLazySettings();
		if (!settings.enabled || !isLazyOptimizationActor(this.actor)) return;

		const li = target?.closest?.(".item");
		if (!li?.dataset?.itemId) return;
		syncExpandedMirrorFromItemRow(this, li);

		if (li.classList.contains("collapsed")) return;

		// A deferred row has no content yet, so it must be filled regardless of enrichOnExpand.
		const wasDeferred = li.dataset.summaryDeferred === "1";
		if (!wasDeferred && !settings.enrichOnExpand) return;

		const item = this.actor?.items?.get(li.dataset.itemId);
		if (!item) return;
		try {
			const chatData = await item.getChatData({ secrets: this.actor.isOwner });
			await applyEnrichedItemSummary(this, li, item, chatData);
			li.removeAttribute("data-summary-deferred");
		} catch (e) {
			console.warn(`[${MODULE_ID}] item-summary-expand-enrich`, e);
		}
	};
	wrappedFn.__dnd4eLazyExpandWrapped = true;
	ActorSheet4e.DEFAULT_OPTIONS.actions.itemSummary = wrappedFn;
}
