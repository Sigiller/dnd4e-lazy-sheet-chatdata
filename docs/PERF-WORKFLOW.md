# Performance iteration loop (dnd4e sheet)

Rule: **one logical step at a time** — measure → conclusion → only then the next step.

## 1. Before changes (baseline)

- Lock in **one** intentional step (one hypothesis / one code change).
- Run `tools/foundry-sheet-e2e` in the **same world** with the same `.env` as the comparison (prefer `COLD_OPEN_RUNS=5`, `COLD_OPEN_ONLY=1`). `FVTT_USER` необязателен: скрипт перебирает пользователей с `/join` до успешного `game.ready` (см. `FVTT_TRY_ALL_USERS`, `JOIN_PER_USER_TIMEOUT_MS` в `.env.example`).
- Save the JSON (`reports/sheet-perf-collect-*.json`) and copy key fields into the log: `coldOpen.summary`, `worldBaseline`, `lazyModuleReport`.

## 2. Implementation

- Change **only** what belongs to the current step (no drive-by refactors).
- After **module** edits, bump **minor** in **`module.json`** and root **`package.json`** (same semver) before the next collect run so `lazyModuleReport.disk` and the client after F5 differ.
- Commit with a clear message (what changed and why).

## 3. After changes

- Repeat the **same** collect run as in step 1.
- Save the second JSON.

## 4. Compare and record

- The probe's timing hooks are **off by default** (they instrument every render). Turn them on for a run with the `[dev] Sheet perf probe: timing hooks` client setting, or `sheetPerfEnableTimingHooks(true)` in the console — otherwise `probeMeasuresForActor` in the collect JSON comes back empty. `sheetOpenMs` is measured by the collector itself and is unaffected.
- Compare: primarily **median / max `sheetOpenMs`**, and if needed **`reloadToGameReadyMs`**, **`longTasksDuringOpen`**, or `RUN_BREAKDOWN=1` on the same actor when ambiguous.
- Add a row to [`PERF-RESULTS.md`](PERF-RESULTS.md): date, step, commits before/after, numbers before/after, short verdict (better / worse / within noise).

## 5. If the result is worse than expected

**Do not move to the next step** until you either:

- roll back the commit (or revert), **or**
- diagnose (UX regression, extra calls, libWrapper order, competing long tasks, etc.) and **fix the current step**, then repeat steps 3–4.

Only after an accepted outcome (improvement or a deliberate “neutral + explained”) — next plan item.

## References

- Baseline series script: `tools/foundry-sheet-e2e/collect-plan-baseline.mjs`
- Module version + git in collect JSON: `lazyModuleReport`
- System compatibility: static checks `tools/verify-integration-points.mjs`, `tools/verify-module-loads.mjs` (dnd4e 0.9.x / Foundry 14) — both run via `npm run verify`. Historical v13 notes: [`AUDIT-0.7.14.md`](AUDIT-0.7.14.md)
