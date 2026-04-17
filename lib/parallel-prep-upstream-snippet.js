/**
 * Parallel biography + item loop cannot be injected reliably with libWrapper alone without copying _prepareContext.
 * This file is a fragment for manual port into systems/dnd4e/module/actor/actor-sheet.js.
 *
 * Idea: after mergeObject(context, …) and computing context.items, run in parallel
 *   Promise.all([ item loop (chatData + detailsText), enrichHTML(biography) ])
 * await both, then assign context.biographyHTML from the second promise.
 *
 * ## Upstream PR checklist (dnd4e, optional after the module stabilizes)
 * 1. **Prep contract**: `Item#getChatData({ sheetList: true })` or `getChatDataForActorSheetList()`
 *    so the module can drop libWrapper from the hot path.
 * 2. **Sheet flag**: `ActorSheet4e` sets `htmlOptions` / internal flag during `_prepareContext`
 *    so core skips full enrich for power cards in prep (see prep-skip-enrich-html).
 * 3. **Parallel items + biography** — snippet below; remove the sequential second biography enrich.
 * 4. **Lazy tabs** (large PR): Handlebars partials or render-active-tab-only +
 *    tab-change hook — see lib/structural-tabs-roadmap.js.
 * 5. Tests: PC sheet with N>100 items, world migration, no regressions in item chat.
 */

export const PARALLEL_PREP_UPSTREAM_SNIPPET = String.raw`
// --- dnd4e actor-sheet.js _prepareContext (patch sketch) ---
// const itemsPromise = Promise.all(context.items.map(async (i) => { ... }));
// const bioPromise = context.isCreature
//   ? foundry.applications.ux.TextEditor.implementation.enrichHTML(context.system.biography, {
//       secrets: isOwner, async: true, relativeTo: this.actor
//     })
//   : Promise.resolve("");
// const [, biographyHTML] = await Promise.all([itemsPromise, bioPromise]);
// context.biographyHTML = biographyHTML;
// (remove the later standalone await enrichHTML for biography)
`;

let _parallelHintLogged = false;
export function logParallelUpstreamSnippetOnce() {
	if (_parallelHintLogged) return;
	_parallelHintLogged = true;
	console.info(
		"%c[dnd4e-lazy-sheet-chatdata]%c Parallel items+biography — see lib/parallel-prep-upstream-snippet.js (export PARALLEL_PREP_UPSTREAM_SNIPPET)",
		"font-weight:bold",
		""
	);
}
