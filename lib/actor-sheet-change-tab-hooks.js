/**
 * changeTab hooks for cold open and related UX:
 * — full item prep after leaving the default powers tab (see deferOffTabItemChatPrep);
 * — full biography enrich on first tab show (lazyBiographyPrep skips enrich in prep).
 */

import { MODULE_ID } from "../constants.js";
import { findBiographyHost } from "./biography-editor-host.js";
import { clearOffTabStubPass } from "./off-tab-item-prep.js";
import { getActorSheetV2ChangeTabTargets, registerLibWrapperFirst } from "./libwrapper-register.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { readLazySettings } from "./lazy-prep-settings.js";
import { currentRenderToken, isCurrentRender } from "./sheet-render-token.js";
import { resolveSheetRoot } from "./sheet-root-element.js";

/**
 * @param {HTMLElement} host
 * @param {string} richStr
 */
function injectBiographyRichIntoHost(host, richStr) {
	const slot =
		host.shadowRoot?.querySelector?.('[part="editor-content"], .editor-content, .prosemirror-editor') ||
		host.querySelector?.(".editor-content");
	if (slot) {
		slot.innerHTML = richStr;
		return;
	}
	let inner = host.querySelector(".bio-rich-placeholder");
	if (!inner) {
		inner = document.createElement("div");
		inner.className = "bio-rich-placeholder";
		host.append(inner);
	}
	inner.innerHTML = richStr;
}

/**
 * @param {ActorSheet} app
 */
async function tryEnrichBiographyWhenTabVisible(app) {
	const settings = readLazySettings();
	if (!settings.enabled || !settings.lazyBiographyPrep) return;
	if (!isLazyOptimizationActor(app.document)) return;
	// Cleared on every render (see registerActorSheetChangeTabHooks): a re-render rewrites the
	// biography DOM from the raw context, so the enrich has to run again.
	if (app._lazyBiographyTabEnrichDone) return;

	const root = resolveSheetRoot(app);
	const bioTab = root?.querySelector('.tab[data-tab="biography"]');
	if (!bioTab?.classList.contains("active")) return;

	if (app._lazyBiographyEnrichInFlight) return app._lazyBiographyEnrichInFlight;

	const actor = app.document;
	const token = currentRenderToken(app);
	app._lazyBiographyEnrichInFlight = (async () => {
		try {
			const rich = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
				actor.system?.biography,
				{ secrets: actor.isOwner, relativeTo: actor }
			);
			// A newer render may have replaced the biography DOM while we awaited.
			if (!isCurrentRender(app, token)) return;

			const root2 = resolveSheetRoot(app);
			const bioTab2 = root2?.querySelector('.tab[data-tab="biography"]');
			if (!bioTab2?.classList.contains("active")) return;

			const host = findBiographyHost(root2);
			if (!host) return;

			injectBiographyRichIntoHost(host, typeof rich === "string" ? rich : String(rich ?? ""));
			app._lazyBiographyTabEnrichDone = true;
		} catch (e) {
			console.warn(`[${MODULE_ID}] biography tab enrich`, e);
		} finally {
			app._lazyBiographyEnrichInFlight = null;
		}
	})();

	return app._lazyBiographyEnrichInFlight;
}

/**
 * After first cold prep with non-power item stubs — one full render on tab change.
 * @param {ActorSheet} app
 * @param {string} tab
 * @param {string} group
 */
function maybeTriggerFullItemPrepAfterOffTabStub(app, tab, group) {
	const settings = readLazySettings();
	if (!settings.enabled || !settings.deferOffTabItemChatPrep) return;
	if (group !== "sheet") return;
	if (app._lazyOffTabItemFullPrep) return;
	const initial = app.constructor.TABS?.sheet?.initial ?? "powers";
	if (initial !== "powers") return;
	if (tab === initial) return;
	app._lazyOffTabItemFullPrep = true;
	clearOffTabStubPass(app);
	void app.render({ force: false });
}

/** @param {Application} app */
function resetLazySheetTabState(app) {
	delete app._lazyOffTabItemFullPrep;
	clearOffTabStubPass(app);
	delete app._lazyBiographyTabEnrichDone;
	delete app._lazyBiographyEnrichInFlight;
}

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
export function registerActorSheetChangeTabHooks(ActorSheet4e) {
	if (!ActorSheet4e?.prototype?.changeTab) return;

	Hooks.on("closeApplicationV2", (app) => {
		if (app instanceof ActorSheet4e) resetLazySheetTabState(app);
	});

	Hooks.on("renderActorSheetV2", (app) => {
		if (!(app instanceof ActorSheet4e)) return;
		// The new DOM carries raw biography HTML again, so this render needs its own enrich.
		delete app._lazyBiographyTabEnrichDone;
		requestAnimationFrame(() => {
			void tryEnrichBiographyWhenTabVisible(app);
		});
	});

	registerLibWrapperFirst(
		"actor-sheet-change-tab-hooks",
		getActorSheetV2ChangeTabTargets(),
		function (wrapped, tab, group, options) {
			const ret = wrapped.call(this, tab, group, options);
			if (!(this instanceof ActorSheet4e)) return ret;
			const schedule = () => {
				maybeTriggerFullItemPrepAfterOffTabStub(this, tab, group);
				if (tab === "biography" && group === "sheet") void tryEnrichBiographyWhenTabVisible(this);
			};
			if (ret && typeof ret.then === "function") ret.then(() => requestAnimationFrame(schedule));
			else requestAnimationFrame(schedule);
			return ret;
		},
		{ perf_mode: libWrapper.PERF_NORMAL }
	);
}
