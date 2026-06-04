/**
 * Entry point: small performance patches for the dnd4e actor sheet (v13).
 * Logic is split across lib/*.js — roughly one future upstream PR per file.
 */

import { MODULE_ID } from "./constants.js";
import { registerModuleSettings } from "./settings.js";
import { registerActorSheet4eClass } from "./lib/sheet-prep-context.js";
import { registerPrepContextMarker } from "./lib/prep-context-marker.js";
import { registerItemGetChatDataLazy } from "./lib/item-getchatdata-lazy.js";
import { registerPrepSkipEnrichHtml } from "./lib/prep-skip-enrich-html.js";
import { registerActorSheetChangeTabHooks } from "./lib/actor-sheet-change-tab-hooks.js";
import { registerItemSummaryExpandEnrich } from "./lib/item-summary-expand-enrich.js";
import { registerRenderCollapsedRowsDeferredFlag } from "./lib/render-collapsed-rows-deferred-flag.js";
import { logParallelUpstreamSnippetOnce } from "./lib/parallel-prep-upstream-snippet.js";
import {
	registerSheetPerfLibWrapperProbes,
	registerSheetPerfProbeInit,
	registerSheetPerfProbeReady
} from "./lib/sheet-perf-probe.js";

/** @type {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default | null} */
let ActorSheet4eClass = null;

Hooks.once("init", () => {
	registerModuleSettings();
	registerSheetPerfProbeInit();
});

Hooks.once("ready", () => {
	if (game.system?.id !== "dnd4e" || !ActorSheet4eClass) return;
	registerPrepContextMarker(ActorSheet4eClass);
	registerSheetPerfProbeReady();
});

Hooks.once("libWrapper.Ready", async () => {
	if (game.system?.id !== "dnd4e") {
		console.warn(`[${MODULE_ID}] This module is for the dnd4e system only.`);
		return;
	}

	try {
		const mod = await import("/systems/dnd4e/module/actor/actor-sheet.js");
		ActorSheet4eClass = mod.default;
	} catch (e) {
		console.error(`[${MODULE_ID}] import actor-sheet`, e);
		return;
	}

	registerActorSheet4eClass(ActorSheet4eClass);
	// _prepareContext: register on ready (fox-4e-styling and other sheet modules register on init first).
	registerPrepSkipEnrichHtml();
	registerItemGetChatDataLazy(ActorSheet4eClass);
	registerItemSummaryExpandEnrich(ActorSheet4eClass);
	registerActorSheetChangeTabHooks(ActorSheet4eClass);
	registerRenderCollapsedRowsDeferredFlag(ActorSheet4eClass);
	try {
		registerSheetPerfLibWrapperProbes();
	} catch (e) {
		console.error(`[${MODULE_ID}] sheet perf probe libWrapper`, e);
	}
	logParallelUpstreamSnippetOnce();

	console.log(
		`[${MODULE_ID}] Patches (libWrapper.Ready): item-getchatdata-lazy; prep-skip-enrich-html; off-tab stub; actor-sheet-change-tab-hooks; item-summary-expand-enrich; render-collapsed-rows-deferred-flag; sheet-perf-probe`
	);
});

