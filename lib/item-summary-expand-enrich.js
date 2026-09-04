/**
 * After expanding an item row — full getChatData + DOM update (dnd4e 0.6-style on click).
 * Upstream: fold into ActorSheet4e.#onItemSummary or a dedicated hook.
 */

import { MODULE_ID } from "../constants.js";
import { syncExpandedMirrorFromItemRow } from "./sheet-expanded-item-ids.js";
import { applyEnrichedItemSummary } from "./item-enriched-summary.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
export function registerItemSummaryExpandEnrich(ActorSheet4e) {
	const orig = ActorSheet4e.DEFAULT_OPTIONS?.actions?.itemSummary;
	if (typeof orig !== "function" || orig.__dnd4eLazyExpandWrapped) return;

	const wrappedFn = async function (event, target) {
		await orig.call(this, event, target);
		if (!isLazyOptimizationActor(this.actor)) return;

		const li = target?.closest?.(".item");
		if (li?.dataset?.itemId) syncExpandedMirrorFromItemRow(this, li);

		if (
			game.settings?.get(MODULE_ID, "enabled") &&
			game.settings.get(MODULE_ID, "deferCollapsedRowChatData") &&
			li &&
			!li.classList.contains("collapsed") &&
			li.dataset.summaryDeferred === "1"
		) {
			try {
				const item = this.actor?.items?.get(li.dataset.itemId);
				if (!item) return;
				const chatData = await item.getChatData({ secrets: this.actor.isOwner });
				await applyEnrichedItemSummary(this, li, item, chatData);
				li.removeAttribute("data-summary-deferred");
			} catch (e) {
				console.warn(`[${MODULE_ID}] item-summary-expand-enrich (deferred stub)`, e);
			}
			return;
		}

		if (!game.settings?.get(MODULE_ID, "enabled")) return;
		if (!game.settings?.get(MODULE_ID, "enrichOnExpand")) return;
		if (!li?.dataset?.itemId) return;
		if (li.classList.contains("collapsed")) return;
		const item = this.actor?.items?.get(li.dataset.itemId);
		if (!item) return;
		try {
			const chatData = await item.getChatData({ secrets: this.actor.isOwner });
			await applyEnrichedItemSummary(this, li, item, chatData);
		} catch (e) {
			console.warn(`[${MODULE_ID}] item-summary-expand-enrich`, e);
		}
	};
	wrappedFn.__dnd4eLazyExpandWrapped = true;
	ActorSheet4e.DEFAULT_OPTIONS.actions.itemSummary = wrappedFn;
}
