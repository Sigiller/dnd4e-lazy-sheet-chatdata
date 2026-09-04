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
import { beginLazyPrep, endLazyPrep } from "./lazy-prep-settings.js";

export { isActorInSheetPrepare };

const PREP_CONTEXT_DIRECT_KEY = Symbol.for(`${MODULE_ID}.prepareContextDirect`);

let prepContextMarkerRegistered = false;

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} sheet
 * @param {() => Promise<object>} callOriginal
 */
async function wrapPrepareContext(sheet, callOriginal) {
	const settings = beginLazyPrep();
	try {
		const actor = sheet.actor;
		if (!settings.enabled || !actor || !isLazyOptimizationActor(actor)) return await callOriginal();

		actorsInSheetPrepare.add(actor);
		preparingSheetByActor.set(actor, sheet);
		applyOffTabStubPassIfNeeded(sheet);
		try {
			return await callOriginal();
		} finally {
			actorsInSheetPrepare.delete(actor);
			preparingSheetByActor.delete(actor);
		}
	} finally {
		endLazyPrep();
	}
}

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
function registerPrepContextMarkerDirect(ActorSheet4e) {
	const proto = ActorSheet4e.prototype;
	if (!proto?._prepareContext || proto._prepareContext[PREP_CONTEXT_DIRECT_KEY]) return false;

	const original = proto._prepareContext;
	proto._prepareContext = async function (options) {
		return wrapPrepareContext(this, () => original.call(this, options));
	};
	Object.defineProperty(proto._prepareContext, PREP_CONTEXT_DIRECT_KEY, { value: true });
	return true;
}

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
export function registerPrepContextMarker(ActorSheet4e) {
	if (prepContextMarkerRegistered) return;
	if (!ActorSheet4e?.prototype?._prepareContext) return;

	const targets = getActorSheet4eMethodTargets(ActorSheet4e, "_prepareContext");
	const ok = registerLibWrapperFirst(
		"prep-context-marker",
		targets,
		async function (wrapped, options) {
			return wrapPrepareContext(this, () => wrapped.call(this, options));
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
