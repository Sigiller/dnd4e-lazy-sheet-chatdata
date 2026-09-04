# dnd4e Lazy Sheet ChatData

Foundry VTT **14** module for **dnd4e** 0.9.x: faster first actor-sheet open by deferring `getChatData` / part of `enrichHTML` for collapsed rows and related patches under `lib/*`. Requires **lib-wrapper**.

Repository: https://github.com/Sigiller/dnd4e-lazy-sheet-chatdata

## Development

- Install the module under `Data/modules/dnd4e-lazy-sheet-chatdata` (or symlink this repo there).
- Sheet diagnostics (`sheetPerf*`, `lib/sheet-perf-probe.js`) ship **inside** this module — disable the old standalone **sheet-perf-probe** module in the world if you still have it.

### Test configuration

Perf collect and module E2E use the same Foundry instance. Configure both tool `.env` files for your world:

| Setting | `foundry-e2e` | `foundry-sheet-e2e` |
|---------|---------------|---------------------|
| World id | `FVTT_WORLD` | `FVTT_WORLD` |
| GM join | `E2E_USER_GM` | `E2E_USER_GM` / `FVTT_USER` |
| Benchmark PC | `E2E_ACTOR_PARTY_MEMBER` | `ACTOR_NAME` |

**Party-sheet smoke/regression:** [`Data/tools/foundry-e2e/.env`](../../tools/foundry-e2e/.env.example) — see [`foundry-e2e/README.md`](../../tools/foundry-e2e/README.md).

**Sheet perf collect:** [`Data/tools/foundry-sheet-e2e/.env`](../../tools/foundry-sheet-e2e/.env.example):

```env
FVTT_WORLD=your-world-id
E2E_USER_GM=Gamemaster
ACTOR_NAME=YourPC
FVTT_RELOAD_AFTER_READY=1
LAZY_MODULE_ID=dnd4e-lazy-sheet-chatdata
```

```bash
cd Data/tools/foundry-sheet-e2e && npm run setup   # once
npm run collect   # → reports/sheet-perf-collect-*.json
```

JSON includes `lazyModuleReport` (semver from `module.json`, git commit, client `game.modules` version).

Module E2E fixtures (if you use party-sheet tests): [`dnd4e-party-sheet/e2e/README.md`](../dnd4e-party-sheet/e2e/README.md).

## Versioning

The **`version`** field in **`module.json`** is what Foundry reads. Root **`package.json`** mirrors the same semver for tooling (`lazyModuleReport.disk.packageJson` in collect). Bump both together after code changes before measuring; compare runs via git commits and collect JSON.

## Performance workflow

One change at a time, compare collect before/after, log results; if metrics regress, investigate or revert before the next step. See [docs/PERF-WORKFLOW.md](docs/PERF-WORKFLOW.md) and the log [docs/PERF-RESULTS.md](docs/PERF-RESULTS.md).

## Releases

Tag a commit with **`v*.*.*`** (e.g. `v0.10.0`). The tag **must** match `version` in `module.json` (without the leading `v`). The [Release workflow](.github/workflows/release.yml) builds `module.zip` (top-level folder `dnd4e-lazy-sheet-chatdata/`) and uploads **`module.json`** + **`module.zip`** to the GitHub Release; both files set `manifest` / `download` to that tag’s asset URLs (Foundry can install from the release `module.json` URL).

**Install from GitHub (after a release exists):** in Foundry, paste the manifest URL from the release page, e.g. `https://github.com/Sigiller/dnd4e-lazy-sheet-chatdata/releases/latest/download/module.json` (or the same path under a specific tag for a pinned version).
