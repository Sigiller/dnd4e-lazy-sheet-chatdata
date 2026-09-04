/**
 * Post-render pass over item rows (module-only, no system template edits):
 *
 * — collapsed rows get `data-summary-deferred` so the expand handler knows to load chatData;
 * — rows that render *expanded* are refreshed with real chatData + enrich after paint.
 *
 * The second half matters because dnd4e re-renders a previously expanded row expanded
 * (`i.collapsed = !#expandedItemIds.has(i._id)`), while prep gave that row a stub or raw HTML.
 * Any actor update (HP, resources, effects) re-renders the sheet, and without this the row would
 * keep showing empty or unenriched text until the user collapsed and expanded it again.
 */

import { MODULE_ID } from "../constants.js";
import { isDnd4eActorSheet } from "./sheet-prep-context.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { readLazySettings } from "./lazy-prep-settings.js";
import { applyEnrichedItemSummary } from "./item-enriched-summary.js";
import { syncExpandedMirrorFromItemRow } from "./sheet-expanded-item-ids.js";
import { currentRenderToken, isCurrentRender } from "./sheet-render-token.js";
import { resolveSheetRoot } from "./sheet-root-element.js";

/** Enrichable syntax: @UUID[…] / @Compendium[…] style references and inline rolls. */
const ENRICHABLE_SYNTAX = /@[A-Za-z]+\[|\[\[/;

/**
 * Does this expanded row actually need a refresh?
 *
 * A deferred row has no content at all. Otherwise prep left the description raw — which only
 * *looks* different from the enriched version if it contains something to enrich. Skipping the
 * rest keeps a re-render from re-running getChatData for every expanded row on a sheet.
 *
 * @param {HTMLElement} li
 */
function needsSummaryRefresh(li) {
	if (li.dataset.summaryDeferred === "1") return true;
	const summary = li.querySelector(".item-summary");
	if (!summary) return false;
	return ENRICHABLE_SYNTAX.test(summary.innerHTML);
}

/**
 * @param {foundry.applications.sheets.ActorSheetV2} app
 * @param {HTMLElement} root
 * @param {number} token render generation `root` belongs to
 */
async function refreshExpandedRows(app, root, token) {
	const rows = [...root.querySelectorAll("li.item:not(.collapsed)[data-item-id]")].filter(
		needsSummaryRefresh
	);
	if (!rows.length) return;

	const actor = app.actor;
	for (const li of rows) {
		const item = actor.items?.get(li.dataset.itemId);
		if (!item) continue;
		try {
			const chatData = await item.getChatData({ secrets: actor.isOwner });
			// A newer render may have replaced these nodes while we awaited.
			if (!isCurrentRender(app, token)) return;
			await applyEnrichedItemSummary(app, li, item, chatData);
			if (!isCurrentRender(app, token)) return;
			li.removeAttribute("data-summary-deferred");
			syncExpandedMirrorFromItemRow(app, li);
		} catch (e) {
			console.warn(`[${MODULE_ID}] render-lazy-rows: refresh expanded row ${li.dataset.itemId}`, e);
		}
	}
}

export function registerRenderLazyRows() {
	Hooks.on("renderActorSheetV2", (app, html) => {
		const settings = readLazySettings();
		if (!settings.enabled) return;
		if (!isDnd4eActorSheet(app) || !isLazyOptimizationActor(app.actor)) return;

		const root = resolveSheetRoot(app, html);
		if (!root) return;

		if (settings.deferCollapsedRowChatData) {
			for (const li of root.querySelectorAll("li.item.collapsed[data-item-id]")) {
				li.setAttribute("data-summary-deferred", "1");
			}
		}

		// Nothing to repair if prep enriched everything itself.
		const anythingDeferred =
			settings.deferCollapsedRowChatData ||
			settings.lazyPowerCardPrepEnrich ||
			settings.deferOffTabItemChatPrep;
		if (!anythingDeferred) return;

		// Capture the generation now: a second render may start before the frame callback runs,
		// and `root` belongs to this one.
		const token = currentRenderToken(app);
		// After paint: this is real getChatData + enrichHTML work, but only for rows the user
		// actually expanded (usually none) and never on the critical path to first paint.
		requestAnimationFrame(() => {
			if (!isCurrentRender(app, token)) return;
			void refreshExpandedRows(app, root, token);
		});
	});
}
