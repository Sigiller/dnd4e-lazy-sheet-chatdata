/**
 * Before Item.roll / toChat: expand deferred row + full getChatData (PC sheets only).
 */

import { MODULE_ID } from "../constants.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { isDnd4eActorSheet } from "./sheet-prep-context.js";
import { withForceFullChatData } from "./force-full-chatdata.js";
import { applyEnrichedItemSummary } from "./item-enriched-summary.js";
import { syncExpandedMirrorFromItemRow } from "./sheet-expanded-item-ids.js";

/**
 * @param {Item} item
 */
export async function ensureItemRowReadyForChat(item) {
	const actor = item?.actor;
	if (!game.settings?.get(MODULE_ID, "enabled") || !isLazyOptimizationActor(actor)) return;

	const sheet = actor.sheet;
	if (!sheet?.rendered || !isDnd4eActorSheet(sheet)) return;

	const root = sheet.element?.[0] ?? sheet.element;
	const li = root?.querySelector?.(`li.item[data-item-id="${item.id}"]`);
	if (!li) return;

	const itemSummary = sheet.constructor.DEFAULT_OPTIONS?.actions?.itemSummary;
	const stubEvent = { preventDefault() {}, stopPropagation() {} };

	if (li.classList.contains("collapsed") && typeof itemSummary === "function") {
		const trigger = li.querySelector('[data-action="itemSummary"]') ?? li;
		await itemSummary.call(sheet, stubEvent, trigger);
		return;
	}

	if (li.dataset.summaryDeferred === "1") {
		const chatData = await withForceFullChatData(item, () =>
			item.getChatData({ secrets: actor.isOwner })
		);
		await applyEnrichedItemSummary(sheet, li, item, chatData);
		li.removeAttribute("data-summary-deferred");
		syncExpandedMirrorFromItemRow(sheet, li);
	}
}
