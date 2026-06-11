/**
 * Wraps ActorSheet4e._prepareContext with a “sheet is preparing” marker
 * so other patches (getChatData, enrichHTML) can tell sheet prep from chat / elsewhere.
 *
 * libWrapper CONFIG paths for dnd4e sheets are often unavailable in the catalog;
 * falls back to a direct prototype patch on ActorSheet4e (Fox4eSheet etc. call super).
 */

import { MODULE_ID } from "../constants.js";
import {
	actorsInSheetPrepare,
	preparingSheetByActor,
	isActorInSheetPrepare
} from "./sheet-prep-context.js";
import { applyOffTabStubPassIfNeeded } from "./off-tab-item-prep.js";
import { getActorSheet4eMethodTargets, registerLibWrapperFirst } from "./libwrapper-register.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";

export { isActorInSheetPrepare };

const PREP_CONTEXT_DIRECT_KEY = Symbol.for(`${MODULE_ID}.prepareContextDirect`);

let prepContextMarkerRegistered = false;

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} sheet
 * @param {Function} callOriginal
 * @param {object} options
 */
async function wrapPrepareContext(sheet, callOriginal, options) {
	if (!game.settings?.get(MODULE_ID, "enabled")) {
		return callOriginal();
	}
	const actor = sheet.actor;
	if (!actor || !isLazyOptimizationActor(actor)) {
		return callOriginal();
	}

	actorsInSheetPrepare.add(actor);
	preparingSheetByActor.set(actor, sheet);
	applyOffTabStubPassIfNeeded(sheet);
	try {
		const ctx = await callOriginal();
		if (game.settings.get(MODULE_ID, "deferCollapsedRowChatData")) {
			for (const i of ctx.items ?? []) {
				if (!i.chatData?._lazyStub) continue;
				delete i.chatData._lazyStub;
				const doc = sheet.actor?.items?.get(i._id);
				if (doc?.type === "power" && doc.system?.autoGenChatPowerCard) i.detailsText = "";
			}
		}
		return ctx;
	} finally {
		actorsInSheetPrepare.delete(actor);
		preparingSheetByActor.delete(actor);
	}
}

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 */
function registerPrepContextMarkerDirect(ActorSheet4e) {
	const proto = ActorSheet4e.prototype;
	if (!proto?._prepareContext || proto._prepareContext[PREP_CONTEXT_DIRECT_KEY]) return false;

	const original = proto._prepareContext;
	proto._prepareContext = async function (options) {
		return wrapPrepareContext(this, () => original.call(this, options), options);
	};
	Object.defineProperty(proto._prepareContext, PREP_CONTEXT_DIRECT_KEY, { value: true });
	return true;
}

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 */
export function registerPrepContextMarker(ActorSheet4e) {
	if (prepContextMarkerRegistered) return;
	if (!ActorSheet4e?.prototype?._prepareContext) return;

	const targets = getActorSheet4eMethodTargets(ActorSheet4e, "_prepareContext");
	const ok = registerLibWrapperFirst(
		"prep-context-marker",
		targets,
		async function (wrapped, options) {
			return wrapPrepareContext(this, () => wrapped.call(this, options), options);
		},
		{ perf_mode: libWrapper.PERF_NORMAL, quiet: true }
	);

	if (ok) {
		prepContextMarkerRegistered = true;
		console.log(`[${MODULE_ID}] prep-context-marker: libWrapper (${targets.length} candidate paths)`);
		return;
	}

	if (registerPrepContextMarkerDirect(ActorSheet4e)) {
		prepContextMarkerRegistered = true;
		console.log(
			`[${MODULE_ID}] prep-context-marker: direct prototype patch on ${ActorSheet4e.name} (libWrapper CONFIG paths unavailable)`
		);
		return;
	}

	console.error(`[${MODULE_ID}] prep-context-marker: failed to register (libWrapper and direct patch)`);
}
