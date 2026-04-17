/**
 * @file Phase-3 cold-open roadmap: lazy tabs / two-phase context without editing system templates.
 * Nothing is registered from main.js — implementation reference only.
 *
 * ## Problem
 * Handlebars builds the whole sheet in one `_prepareContext` + `_renderHTML`. After getChatData/enrich,
 * the main ceiling is HTML volume and passes over sections the user does not see on the first tab.
 *
 * ## Options (dnd4e-lazy-sheet-chatdata module only)
 *
 * **A. Two-phase context (flicker risk)**
 * - libWrapper `_prepareContext`: first await — trimmed `context` (e.g. summary tab only +
 *   empty placeholders for other tabs); `queueMicrotask` / `requestAnimationFrame` — second
 *   `this.render(false)` or targeted data refresh via public sheet API.
 * - Plus: can keep a single template pass partially. Minus: two frames, need anti-flicker (opacity/skeleton).
 *
 * **B. Tab-change hooks (less flicker, more integration)**
 * - Hook dnd4e / ActorSheetV2 tab switch; on first show of a tab — load only that slice of context and `render(false)`.
 * - Implemented (module + `actor-sheet.js`): cold open with default **powers** tab —
 *   `deferOffTabItemChatPrep` + `lib/actor-sheet-change-tab-hooks.js`; biography — enrich on first tab show.
 * - Plus: UX closer to core. Minus: depends on internal tab names/selectors.
 *
 * **C. Upstream dnd4e (clean path toward <1 s)**
 * - Split templates into lazy partials or an official “render active tab only” flag.
 * - See {@link file:./parallel-prep-upstream-snippet.js} for prep API ideas.
 *
 * ## Risks
 * - ProseMirror / biography editors with deferred enrich.
 * - Tokens assuming full sheet DOM on open.
 * - Other modules patching the same `_prepareContext`.
 *
 * ## Acceptance (before default-on)
 * - COLD_OPEN_RUNS=5: median sheetOpenMs vs baseline in the same world.
 * - Manual checklist: every tab, item expand, power card, field save.
 */

/** Placeholder for future `registerDeferredTabs()` — do not wire up yet. */
export const DEFERRED_TABS_ROADMAP_VERSION = 1;
