# Phase-3 cold-open roadmap: lazy tabs / two-phase context

Reference notes only — nothing here is wired up. (Previously `lib/structural-tabs-roadmap.js`,
which shipped 38 lines of prose as an ES module for no runtime purpose.)

## Problem

Handlebars builds the whole sheet in one `_prepareContext` + `_renderHTML`. Once `getChatData`
and `enrichHTML` are deferred, the remaining ceiling is HTML volume and passes over sections the
user does not see on the first tab.

## Options (this module only)

### A. Two-phase context (flicker risk)

- libWrapper `_prepareContext`: first await returns a trimmed `context` (e.g. summary tab only,
  empty placeholders for other tabs); then `queueMicrotask` / `requestAnimationFrame` triggers a
  second `this.render(false)` or a targeted data refresh via public sheet API.
- Plus: keeps a single template pass, partially. Minus: two frames, needs anti-flicker
  (opacity / skeleton).

### B. Tab-change hooks (less flicker, more integration)

- Hook the dnd4e / ActorSheetV2 tab switch; on first show of a tab load only that slice of
  context and `render(false)`.
- **Implemented**: cold open with default **powers** tab — `deferOffTabItemChatPrep` +
  [`lib/actor-sheet-change-tab-hooks.js`](../lib/actor-sheet-change-tab-hooks.js); biography
  enriches on first tab show.
- Plus: UX closer to core. Minus: depends on internal tab names / selectors.

### C. Upstream dnd4e (clean path toward <1 s)

- Split templates into lazy partials, or add an official "render active tab only" flag.
- See [UPSTREAM-PR-NOTES.md](UPSTREAM-PR-NOTES.md) for prep API ideas.

## Risks

- ProseMirror / biography editors with deferred enrich.
- Tokens or macros assuming the full sheet DOM exists on open.
- Other modules patching the same `_prepareContext`.

## Acceptance (before default-on)

- `COLD_OPEN_RUNS=5`: median `sheetOpenMs` vs baseline in the same world.
- Manual checklist: every tab, item expand, power card, field save.
