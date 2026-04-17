/**
 * Entry point: small performance patches for the dnd4e actor sheet (v13).
 * Logic is split across lib/*.js — roughly one future upstream PR per file.
 */

import { MODULE_ID } from "./constants.js";
import { registerModuleSettings } from "./settings.js";
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

Hooks.once("init", () => {
	registerModuleSettings();
	registerRenderCollapsedRowsDeferredFlag();
	registerSheetPerfProbeInit();
});

Hooks.once("ready", () => {
	if (game.system?.id === "dnd4e") registerSheetPerfProbeReady();
});

Hooks.once("libWrapper.Ready", async () => {
	if (game.system?.id !== "dnd4e") {
		console.warn(`[${MODULE_ID}] This module is for the dnd4e system only.`);
		return;
	}

	let ActorSheet4e;
	try {
		const mod = await import("/systems/dnd4e/module/actor/actor-sheet.js");
		ActorSheet4e = mod.default;
	} catch (e) {
		console.error(`[${MODULE_ID}] import actor-sheet`, e);
		return;
	}

	// Single libWrapper on enrichHTML (prep-skip + LRU inside); then other targets.
	registerPrepSkipEnrichHtml();
	registerItemGetChatDataLazy();
	registerPrepContextMarker(ActorSheet4e);
	registerItemSummaryExpandEnrich(ActorSheet4e);
	registerActorSheetChangeTabHooks(ActorSheet4e);
	try {
		registerSheetPerfLibWrapperProbes();
	} catch (e) {
		console.error(`[${MODULE_ID}] sheet perf probe libWrapper`, e);
	}
	logParallelUpstreamSnippetOnce();

	console.log(
		`[${MODULE_ID}] Patches: prep-context-marker (+ post-stub); item-getchatdata-lazy, prep-skip-enrich-html, actor-sheet-change-tab-hooks (cold: off-tab item stub + bio tab enrich), item-summary-expand-enrich, render-collapsed-rows-deferred-flag; sheet-perf-probe (lib/sheet-perf-probe.js); actor-sheet.js — deferOffTabItemChatPrep; upstream snippet/PR — parallel-prep-upstream-snippet.js`
	);
});
