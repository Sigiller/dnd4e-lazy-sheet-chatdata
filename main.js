/**
 * Entry point: small performance patches for the dnd4e actor sheet (Foundry v14).
 * Logic is split across lib/*.js — roughly one future upstream PR per file.
 */

import { ACTOR_SHEET4E_IMPORT, MODULE_ID } from "./constants.js";
import { registerModuleSettings } from "./settings.js";
import { registerActorSheet4eClass } from "./lib/sheet-prep-context.js";
import { registerPrepContextMarker } from "./lib/prep-context-marker.js";
import { registerItemGetChatDataLazy } from "./lib/item-getchatdata-lazy.js";
import { registerPrepSkipEnrichHtml } from "./lib/prep-skip-enrich-html.js";
import { registerActorSheetChangeTabHooks } from "./lib/actor-sheet-change-tab-hooks.js";
import { registerItemSummaryExpandEnrich } from "./lib/item-summary-expand-enrich.js";
import { registerRenderLazyRows } from "./lib/render-lazy-rows.js";
import { registerSheetRenderToken } from "./lib/sheet-render-token.js";
import { registerSheetPerfProbeInit, registerSheetPerfProbeReady } from "./lib/sheet-perf-probe.js";
import { registerItemChatPrepHooks } from "./lib/item-chat-prep-hooks.js";

/** @type {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default | null} */
let ActorSheet4eClass = null;

/**
 * _prepareContext is wrapped on ready, after every other sheet module has registered its own
 * (fox-4e-styling and friends register on init). Idempotent, and called from both hooks because
 * either can win the race: the libWrapper.Ready handler may await a dynamic import past `ready`.
 */
function registerPrepContextMarkerWhenPossible() {
	if (!ActorSheet4eClass || !game.ready) return;
	registerPrepContextMarker(ActorSheet4eClass);
}

Hooks.once("init", () => {
	registerModuleSettings();
	registerSheetPerfProbeInit();
});

Hooks.once("ready", () => {
	if (game.system?.id !== "dnd4e") return;
	registerPrepContextMarkerWhenPossible();
	registerSheetPerfProbeReady();
});

Hooks.once("libWrapper.Ready", async () => {
	if (game.system?.id !== "dnd4e") {
		console.warn(`[${MODULE_ID}] This module is for the dnd4e system only.`);
		return;
	}

	try {
		ActorSheet4eClass = globalThis.dnd4e?.applications?.sheets?.ActorSheet4e ?? null;
		if (!ActorSheet4eClass) {
			const mod = await import(ACTOR_SHEET4E_IMPORT);
			ActorSheet4eClass = mod.default;
		}
	} catch (e) {
		console.error(`[${MODULE_ID}] import actor-sheet`, e);
		return;
	}

	registerActorSheet4eClass(ActorSheet4eClass);
	registerSheetRenderToken(); // first renderActorSheetV2 listener: bumps the render generation
	registerPrepSkipEnrichHtml();
	registerItemGetChatDataLazy();
	registerItemChatPrepHooks();
	registerItemSummaryExpandEnrich(ActorSheet4eClass);
	registerActorSheetChangeTabHooks(ActorSheet4eClass);
	registerRenderLazyRows();
	registerPrepContextMarkerWhenPossible(); // no-op unless `ready` already fired

	console.log(
		`[${MODULE_ID}] Patches (libWrapper.Ready): item-getchatdata-lazy; item-chat-prep-hooks; prep-skip-enrich-html; off-tab stub; actor-sheet-change-tab-hooks; item-summary-expand-enrich; render-lazy-rows`
	);
});
