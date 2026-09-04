/**
 * Cold open: stub non-power getChatData on first prep when default tab is Powers (module-only).
 */

import { isItemExpandedOnSheet } from "./sheet-expanded-item-ids.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { lazySettings } from "./lazy-prep-settings.js";

/**
 * @param {import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} sheet
 */
export function applyOffTabStubPassIfNeeded(sheet) {
	const settings = lazySettings();
	if (!settings.enabled || !settings.deferOffTabItemChatPrep) return;
	if (!isLazyOptimizationActor(sheet?.actor)) return;
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
