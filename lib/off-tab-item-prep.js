/**
 * Cold open: stub non-power getChatData on first prep when default tab is Powers (module-only).
 */

import { MODULE_ID } from "../constants.js";
import { isItemExpandedOnSheet } from "./sheet-expanded-item-ids.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";

/**
 * @param {import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} sheet
 */
export function applyOffTabStubPassIfNeeded(sheet) {
	if (!game.settings?.get(MODULE_ID, "enabled")) return;
	if (!isLazyOptimizationActor(sheet?.actor)) return;
	if (!game.settings.get(MODULE_ID, "deferOffTabItemChatPrep")) return;
	if (sheet._lazyOffTabItemFullPrep) return;
	const initial = sheet.constructor.TABS?.sheet?.initial ?? "powers";
	if (initial !== "powers") return;
	sheet._lazyOffTabStubPass = true;
}

/**
 * @param {import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} sheet
 * @param {Item} item
 */
export function shouldStubOffTabItem(sheet, item) {
	if (!sheet?._lazyOffTabStubPass) return false;
	if (item.type === "power") return false;
	return !isItemExpandedOnSheet(sheet, item.id);
}

/** @param {import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} sheet */
export function clearOffTabStubPass(sheet) {
	delete sheet._lazyOffTabStubPass;
}
