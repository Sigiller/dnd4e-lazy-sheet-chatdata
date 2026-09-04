/**
 * On renderActorSheetV2, mark collapsed rows with data-summary-deferred for load-on-click (module-only, no system template edits).
 */

import { MODULE_ID } from "../constants.js";
import { isDnd4eActorSheet } from "./sheet-prep-context.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
export function registerRenderCollapsedRowsDeferredFlag(ActorSheet4e) {
	Hooks.on("renderActorSheetV2", (app, html) => {
		if (!game.settings?.get(MODULE_ID, "enabled")) return;
		if (!game.settings.get(MODULE_ID, "deferCollapsedRowChatData")) return;
		if (!isDnd4eActorSheet(app) || !isLazyOptimizationActor(app.actor)) return;
		const root = html?.[0] ?? html ?? app.element?.[0] ?? app.element;
		if (!root?.querySelectorAll) return;
		for (const li of root.querySelectorAll("li.item.collapsed[data-item-id]")) {
			li.setAttribute("data-summary-deferred", "1");
		}
	});
}
