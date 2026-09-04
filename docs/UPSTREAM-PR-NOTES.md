# Upstream dnd4e PR notes

Reference notes only. (Previously `lib/parallel-prep-upstream-snippet.js`, which shipped a
commented-out code string as an ES module and printed a `console.info` nag to every user on
world load.)

Parallel biography + item loop cannot be injected reliably with libWrapper alone without copying
`_prepareContext`, so the snippet below is for manual port into
`systems/dnd4e/module/applications/sheets/actor-sheet.mjs`.

## Checklist (optional, after the module stabilizes)

1. **Prep contract**: `Item#getChatData({ sheetList: true })` or
   `getChatDataForActorSheetList()` so the module can drop libWrapper from the hot path.
2. **Sheet flag**: `ActorSheet4e` sets `htmlOptions` / an internal flag during `_prepareContext`
   so core skips full enrich for power cards in prep (see `lib/prep-skip-enrich-html.js`).
3. **Parallel items + biography** — snippet below; remove the sequential second biography enrich.
4. **Lazy tabs** (large PR): Handlebars partials, or render-active-tab-only plus a tab-change
   hook — see [ROADMAP-structural-tabs.md](ROADMAP-structural-tabs.md).
5. Tests: PC sheet with N>100 items, world migration, no regressions in item chat.

## Snippet sketch

After `mergeObject(context, …)` and computing `context.items`, run the item loop and the
biography enrich concurrently:

```js
// --- dnd4e actor-sheet.mjs _prepareContext (patch sketch) ---
const itemsPromise = Promise.all(context.items.map(async (i) => { /* … */ }));
const bioPromise = context.isCreature
  ? foundry.applications.ux.TextEditor.implementation.enrichHTML(context.system.biography, {
      secrets: isOwner,
      relativeTo: this.actor
    })
  : Promise.resolve("");
const [, biographyHTML] = await Promise.all([itemsPromise, bioPromise]);
context.biographyHTML = biographyHTML;
// (remove the later standalone `await enrichHTML` for biography)
```
