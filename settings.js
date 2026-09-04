import { MODULE_ID } from "./constants.js";

/**
 * World-scoped flags (GM toggles). Each patch file checks `enabled` and its own key.
 * Read on the prep hot path via lib/lazy-prep-settings.js — add new keys to KEYS there.
 */
export function registerModuleSettings() {
	game.settings.register(MODULE_ID, "enabled", {
		name: "Module enabled",
		hint: "Master switch for all optimizations in this package.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "enrichOnExpand", {
		name: "Full enrich when expanding an item row",
		hint: "After itemSummary — full getChatData and DOM update (see lib/item-summary-expand-enrich.js). Rows whose chatData was deferred are always filled on expand regardless of this flag.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "deferCollapsedRowChatData", {
		name: "Collapsed rows: skip getChatData until expanded",
		hint: "During sheet prep — stub instead of getChatData for collapsed rows; data-summary-deferred via render hook; full load on click (module-only, no dnd4e core edits).",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "lazyBiographyPrep", {
		name: "Biography: skip enrich during sheet prep",
		hint: "During _prepareContext — leave biography as raw HTML. Full enrich runs after each render while the Biography tab is shown (lib/actor-sheet-change-tab-hooks.js).",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "lazyPowerCardPrepEnrich", {
		name: "Power card (autoGen): skip enrich during prep",
		hint: "During _prepareContext do not call enrichHTML for detailsText / item descriptions. Rows that render expanded are enriched after paint (lib/render-lazy-rows.js). See lib/prep-skip-enrich-html.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "deferOffTabItemChatPrep", {
		name: "[Cold open] Defer non-power getChatData until leaving Powers tab",
		hint: "When the default sheet tab is Powers: first _prepareContext stubs chatData for non-power items (except expanded rows); full sheet re-render after switching to any other tab (lib/actor-sheet-change-tab-hooks.js). Module-only.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "enrichHtmlSessionCache", {
		name: "enrichHTML session cache",
		hint: "Short LRU keyed by input hash + actor + secrets, for enrich calls that carry no rollData. See lib/enrich-html-session-cache.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
}
