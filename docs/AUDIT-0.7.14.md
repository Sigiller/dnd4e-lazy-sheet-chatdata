# Audit: dnd4e 0.7.14 vs dnd4e-lazy-sheet-chatdata 0.10.0

**Date (UTC):** 2026-06-02  
**World reference:** `scales-of-war` (`systemVersion`: 0.7.14)

**0.11.0 (module):** cold-open fix — `preparingSheetByActor` registry, prep never calls full `getChatData`, compendium-link stub, module-only `deferOffTabItemChatPrep` stubs. Re-verify with e2e after upgrade.

## Verdict

| Question | Result |
|----------|--------|
| Breaking API changes in 0.7.14? | **None found** |
| Module update required urgently? | **No** |
| Core optimizations still valid? | **Yes** (collapsed stub, enrich skip, expand, biography tab) |
| Known gap | **`deferOffTabItemChatPrep`** — no cold-open gain without core patch or module-only stub |

---

## Automated checks (workspace)

Run from repo root:

```bash
node Data/modules/dnd4e-lazy-sheet-chatdata/tools/verify-integration-points.mjs
node Data/modules/dnd4e-lazy-sheet-chatdata/tools/verify-getchatdata-sync.mjs
```

| Script | Result (2026-06-02) |
|--------|---------------------|
| `verify-integration-points.mjs` | **PASS** — all hook targets present in dnd4e 0.7.14; no `deferOffTabItemChatPrep` in core |
| `verify-getchatdata-sync.mjs` | **PASS** (`matchIgnoringWhitespace: true`) — `getChatDataSheetListFast` matches `Item4e.getChatData` except `enrichHTML` |

---

## Integration contract (static)

| Patch | System target 0.7.14 | Status |
|-------|----------------------|--------|
| `registerPrepContextMarker` | `ActorSheet4e._prepareContext` + item `getChatData` loop | OK |
| `registerItemGetChatDataLazy` | `Item4e.getChatData` | OK |
| `registerPrepSkipEnrichHtml` | `TextEditor.implementation.enrichHTML` | OK |
| `registerItemSummaryExpandEnrich` | `DEFAULT_OPTIONS.actions.itemSummary` | OK |
| `registerActorSheetChangeTabHooks` | `changeTab`, initial tab `powers` | OK |
| `registerRenderCollapsedRowsDeferredFlag` | `renderActorSheetV2` + tab templates | OK |

Out of scope: `Item4e.roll`, chat flags, `renderChatMessageHTML`, `dice.js` (0.7.13–0.7.14 chat/roll fixes do not affect sheet patches).

---

## `deferOffTabItemChatPrep` (important)

Documented in [`settings.js`](../settings.js) as requiring a patch in `systems/dnd4e/module/actor/actor-sheet.js`. **That patch is not in upstream 0.7.14.**

What the module does today ([`actor-sheet-change-tab-hooks.js`](../lib/actor-sheet-change-tab-hooks.js)):

- On first leave from the default **Powers** tab → `app.render({ force: false })`.
- Does **not** stub non-power `getChatData` on the first `_prepareContext`.

The ~35% cold-open improvement in [`PERF-RESULTS.md`](PERF-RESULTS.md) (0.9.0 + core patch) **does not apply** on stock 0.7.14. This is **not** a 0.7.14 regression.

**Recommendation:** Disable `deferOffTabItemChatPrep` if the extra re-render on tab change is unwanted; or implement off-tab stub entirely in the module (future work).

---

## Manual regression checklist (Foundry UI)

E2E collect (`tools/foundry-sheet-e2e`) — see [`PERF-RESULTS.md`](PERF-RESULTS.md) row 2026-06-02 (`sheet-perf-collect-1780397864040.json`). Manual UI checks still useful:

| # | Test | Expected |
|---|------|----------|
| 1 | Cold open PC/NPC sheet (~50+ items) | No console errors; acceptable open time |
| 2 | Collapsed row + expand | Empty summary → full text; `data-summary-deferred` removed |
| 3 | Power `autoGenChatPowerCard` | Raw card on prep → expressions OK after expand (0.7.13 fix) |
| 4 | Biography tab | Rich text on first visit to Biography |
| 5 | `deferOffTabItemChatPrep` | No faster first open; optional re-render on tab leave only |
| 6 | Chat power card → attack/damage | Smoke test (system 0.7.14) |

Optional perf: `globalThis.sheetPerfBaseline("ActorName")` — see [`PERF-WORKFLOW.md`](PERF-WORKFLOW.md).

---

## Changelog 0.7.11 → 0.7.14 (module impact)

| Version | Change | Module impact |
|---------|--------|---------------|
| 0.7.14 | Combat turn / damage | None |
| 0.7.13 | Roll expressions in chat; charge/opp config | Chat only; sheet expand gets full enrich |
| 0.7.12 | NPC sheet, damage, equipment | None on hooks |
| 0.7.11 | Movement traits | None |

---

## Future upgrades

On each dnd4e bump:

1. Run both `tools/verify-*.mjs` scripts.
2. Diff `module/item/item.js` `getChatData` vs `lib/get-chat-data-sheet-list-fast.js`.
3. Re-check `actor-sheet.js` item loop and `itemSummary` / templates.
4. Re-run manual checklist or `npm run collect` in `tools/foundry-sheet-e2e` (world logged in).

---

## Manifest note

`module.json` still lists `verified: 0.7.11`. Functional compatibility with **0.7.14** is supported per this audit; bump `verified` when you cut a release after manual sign-off.
