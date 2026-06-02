/**
 * changeTab hooks for cold open and related UX:
 * — full item prep after leaving the default powers tab (see deferOffTabItemChatPrep + actor-sheet.js);
 * — full biography enrich on first tab show (lazyBiographyPrep skips enrich in prep).
 */

import { MODULE_ID } from "../constants.js";
import { findBiographyHost } from "./biography-editor-host.js";
import { clearOffTabStubPass } from "./off-tab-item-prep.js";

/** @param {ActorSheet} app */
function isCreatureActorSheet(app) {
	const t = app.document?.type;
	return t === "Player Character" || t === "NPC";
}

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
	if (!game.settings?.get(MODULE_ID, "enabled")) return;
	if (!game.settings.get(MODULE_ID, "lazyBiographyPrep")) return;
	if (!isCreatureActorSheet(app)) return;
	if (app._lazyBiographyTabEnrichDone) return;

	const root = app.element?.[0] ?? app.element;
	if (!root) return;

	const bioTab = root.querySelector?.('.tab[data-tab="biography"]');
	if (!bioTab?.classList.contains("active")) return;

	if (app._lazyBiographyEnrichInFlight) return app._lazyBiographyEnrichInFlight;

	const actor = app.document;
	app._lazyBiographyEnrichInFlight = (async () => {
		try {
			const bio = actor.system?.biography;
			const rich = await foundry.applications.ux.TextEditor.implementation.enrichHTML(bio, {
				secrets: actor.isOwner,
				async: true,
				relativeTo: actor
			});
			const richStr = typeof rich === "string" ? rich : String(rich ?? "");

			const root2 = app.element?.[0] ?? app.element;
			const bioTab2 = root2?.querySelector?.('.tab[data-tab="biography"]');
			if (!bioTab2?.classList.contains("active")) return;

			const host = findBiographyHost(root2);
			if (!host) return;

			injectBiographyRichIntoHost(host, richStr);
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
	if (!game.settings?.get(MODULE_ID, "enabled")) return;
	if (game.settings.get(MODULE_ID, "deferOffTabItemChatPrep") === false) return;
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
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 */
export function registerActorSheetChangeTabHooks(ActorSheet4e) {
	if (!ActorSheet4e?.prototype?.changeTab) return;

	Hooks.on("closeApplication", (app) => {
		if (app instanceof ActorSheet4e) resetLazySheetTabState(app);
	});

	Hooks.on("renderActorSheetV2", (app) => {
		if (!(app instanceof ActorSheet4e)) return;
		requestAnimationFrame(() => {
			void tryEnrichBiographyWhenTabVisible(app);
		});
	});

	try {
		libWrapper.register(
			MODULE_ID,
			ActorSheet4e.prototype.changeTab,
			function (wrapped, tab, group, options) {
				const ret = wrapped.call(this, tab, group, options);
				const schedule = () => {
					maybeTriggerFullItemPrepAfterOffTabStub(this, tab, group);
					if (tab === "biography" && group === "sheet") void tryEnrichBiographyWhenTabVisible(this);
				};
				if (ret && typeof ret.then === "function") ret.then(() => requestAnimationFrame(schedule));
				else requestAnimationFrame(schedule);
				return ret;
			},
			libWrapper.WRAPPER,
			{ perf_mode: libWrapper.PERF_NORMAL }
		);
	} catch (e) {
		console.error(`[${MODULE_ID}] actor-sheet-change-tab-hooks`, e);
	}
}
