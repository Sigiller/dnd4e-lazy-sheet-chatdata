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

Hooks.once("init", () => {
	registerModuleSettings();
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

	registerActorSheet4eClass(ActorSheet4e);

	// preparingSheet registry before getChatData wraps run during _prepareContext
	registerPrepContextMarker(ActorSheet4e);
	registerPrepSkipEnrichHtml();
	registerItemGetChatDataLazy(ActorSheet4e);
	registerItemSummaryExpandEnrich(ActorSheet4e);
	registerActorSheetChangeTabHooks(ActorSheet4e);
	registerRenderCollapsedRowsDeferredFlag(ActorSheet4e);
	try {
		registerSheetPerfLibWrapperProbes();
	} catch (e) {
		console.error(`[${MODULE_ID}] sheet perf probe libWrapper`, e);
	}
	logParallelUpstreamSnippetOnce();

	console.log(
		`[${MODULE_ID}] Patches: sheet-prep-context; prep-context-marker; item-getchatdata-lazy (prep stub/fast only); prep-skip-enrich-html; off-tab item stub; actor-sheet-change-tab-hooks; item-summary-expand-enrich; render-collapsed-rows-deferred-flag; sheet-perf-probe`
	);
});
