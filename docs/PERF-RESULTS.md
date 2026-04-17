# Comparative run log (cold open)

Add **one table row per completed step** after comparing two JSON files (before / after). Filenames: `tools/foundry-sheet-e2e/sheet-perf-collect-*.json`.

Copy the header row if you extend the table:

| Date (UTC) | Step (short) | Commit before | Commit after | sheetOpen median before (ms) | sheetOpen median after (ms) | max before | max after | Notes |
|------------|--------------|---------------|--------------|-------------------------------|----------------------------|------------|-----------|-------|
| 2026-04-17 | collect: cold-open phases (`preRender*` + sheet `_preRender`, `renderActorSheet4e`, match `actor`) — **not module code**, `tools/foundry-sheet-e2e` | 4be2b4d | cad0ca4 | 3527 (run `…159345`, phases `?/?`) | 3507 (`…330201`) | — | — | `coldOpenPhasingMs`: start→pre ≈2715ms, pre→hook ≈562ms, hook→rAF ≈231ms. FVTT client before F5: `0.3.0`, disk `module.json`/`package.json` **0.4.0**. |
| 2026-04-16 | module 0.7.0: removed list-fast prep collection and `lazySheetListFast*` fields in collect JSON (default run had null) | — | — | — | — | — | — | Removed `sheet-list-fast-metrics.js`, collect global; earlier 0.5.0–0.6.0 — experiment with `lazySheetListFastMetrics` / `logSheetListFastAggregates`. |
| 2026-04-16 | baseline cold open after 0.7.0 (same `.env`, COLD_OPEN_ONLY=1, RUN_COLD_OPEN, 5 runs) — **reference before tab phase** | — | — | — | **3985** (`sheet-perf-collect-1776434390588.json`, median `sheetOpenMs`) | — | **4421** | min 3130ms, mean 3944ms; `reload→ready` median 7692ms; `lazyModuleReport` disk/client **0.7.0**. Next perf step: [`lib/structural-tabs-roadmap.js`](../lib/structural-tabs-roadmap.js) — option **B** (load on first tab show) or **A** (two-phase `_prepareContext`); **C** — separate PR to `systems/dnd4e`. |
| 2026-04-17 | 0.8.0: biography enrich on tab; cold open after F5, disk=client **0.8.0** | — | — | **3985** (baseline `…4390588`) | **4286** (`sheet-perf-collect-1776435181217.json`) | **4421** | **4776** | `reload→ready` median 8134 vs 7692ms — session noise. |
| 2026-04-17 | **0.9.0** collect: `deferOffTabItemChatPrep` + `actor-sheet.js` patch, disk=client **0.9.0** | — | — | **3985** (`…4390588`, 0.7.0) | **2595** (`sheet-perf-collect-1776436062124.json`) | **4421** | **2940** | median `sheetOpenMs` ~−35% vs 0.7.0 baseline; longTasks count stable **6** per open; `reload→ready` median **9433** ms (not a sheet metric). |

How to maintain: see [PERF-WORKFLOW.md](PERF-WORKFLOW.md).
