/**
 * Точка входа: тонкие патчи производительности листа dnd4e (v13).
 * Логика разнесена по lib/*.js — каждый файл ≈ один будущий PR в систему.
 */

import { MODULE_ID } from "./constants.js";
import { registerModuleSettings } from "./settings.js";
import { registerPrepContextMarker } from "./lib/prep-context-marker.js";
import { registerItemGetChatDataLazy } from "./lib/item-getchatdata-lazy.js";
import { registerPrepSkipEnrichHtml } from "./lib/prep-skip-enrich-html.js";
import { registerPostIdleBiographyEnrich } from "./lib/post-idle-biography-enrich.js";
import { registerItemSummaryExpandEnrich } from "./lib/item-summary-expand-enrich.js";
import { registerRenderCollapsedRowsDeferredFlag } from "./lib/render-collapsed-rows-deferred-flag.js";
import { logParallelUpstreamSnippetOnce } from "./lib/parallel-prep-upstream-snippet.js";

Hooks.once("init", () => {
	registerModuleSettings();
	registerRenderCollapsedRowsDeferredFlag();
});

Hooks.once("libWrapper.Ready", async () => {
	if (game.system?.id !== "dnd4e") {
		console.warn(`[${MODULE_ID}] Модуль только для системы dnd4e.`);
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

	// Один libWrapper на enrichHTML (prep-skip + LRU внутри); затем остальные цели.
	registerPrepSkipEnrichHtml();
	registerItemGetChatDataLazy();
	registerPrepContextMarker(ActorSheet4e);
	registerItemSummaryExpandEnrich(ActorSheet4e);
	registerPostIdleBiographyEnrich(ActorSheet4e);
	logParallelUpstreamSnippetOnce();

	console.log(
		`[${MODULE_ID}] Патчи: prep-context-marker (+ post-stub power details), item-getchatdata-lazy, prep-skip-enrich-html, post-idle-biography-enrich, item-summary-expand-enrich, render-collapsed-rows-deferred-flag; профиль prep — настройка logSheetListFastAggregates; сниппет/PR — parallel-prep-upstream-snippet.js; фаза вкладок — lib/structural-tabs-roadmap.js`
	);
});
