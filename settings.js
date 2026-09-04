import { MODULE_ID } from "./constants.js";

/**
 * World-scoped flags (GM toggles). Each patch file checks `enabled` and its own key.
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
		hint: "After itemSummary — full getChatData and DOM update (see lib/item-summary-expand-enrich.js).",
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
		hint: "During _prepareContext — leave biography as raw HTML. Full enrich runs when the Biography tab is first shown (lib/actor-sheet-change-tab-hooks.js).",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "lazyPowerCardPrepEnrich", {
		name: "Power card (autoGen): skip enrich during prep",
		hint: "During _prepareContext do not call enrichHTML for detailsText; raw card HTML until expand/re-render. See lib/prep-skip-enrich-html.js.",
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

	game.settings.register(MODULE_ID, "deferCompendiumEnrichDuringPrep", {
		name: "Compendium links: stub getChatData during sheet prep",
		hint: "During _prepareContext, items whose description contains @Compendium/@UUID/@Item/@Actor links get an empty stub until the row is expanded (full enrich on expand if «Full enrich when expanding» is on).",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "enrichHtmlSessionCache", {
		name: "enrichHTML session cache",
		hint: "Short LRU keyed by input hash + actor + secrets. See lib/enrich-html-session-cache.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});
}
