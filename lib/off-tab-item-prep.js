/**
 * Cold open: stub non-power getChatData on first prep when default tab is Powers (module-only).
 */

import { MODULE_ID } from "../constants.js";
import { isItemExpandedOnSheet } from "./sheet-expanded-item-ids.js";

/**
 * @param {import("/systems/dnd4e/module/actor/actor-sheet.js").default} sheet
 */
export function applyOffTabStubPassIfNeeded(sheet) {
	if (!game.settings?.get(MODULE_ID, "enabled")) return;
	if (!game.settings.get(MODULE_ID, "deferOffTabItemChatPrep")) return;
	if (sheet._lazyOffTabItemFullPrep) return;
	const initial = sheet.constructor.TABS?.sheet?.initial ?? "powers";
	if (initial !== "powers") return;
	sheet._lazyOffTabStubPass = true;
}

/**
 * @param {import("/systems/dnd4e/module/actor/actor-sheet.js").default} sheet
 * @param {Item} item
 */
export function shouldStubOffTabItem(sheet, item) {
	if (!sheet?._lazyOffTabStubPass) return false;
	if (item.type === "power") return false;
	return !isItemExpandedOnSheet(sheet, item.id);
}

/** @param {import("/systems/dnd4e/module/actor/actor-sheet.js").default} sheet */
export function clearOffTabStubPass(sheet) {
	delete sheet._lazyOffTabStubPass;
}
