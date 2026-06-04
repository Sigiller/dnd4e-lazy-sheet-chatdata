/**
 * FVTT 13 libWrapper: target must be a descriptor string (or numeric id), not a function reference.
 */

import { MODULE_ID } from "../constants.js";

/**
 * @param {string} label
 * @param {string[]} targets
 * @param {function} fn
 * @param {object} [opts]
 * @returns {boolean}
 */
export function registerLibWrapperFirst(label, targets, fn, opts = {}) {
	const type = opts.type ?? libWrapper.WRAPPER;
	const perf = opts.perf_mode ?? libWrapper.PERF_NORMAL;
	for (const target of targets) {
		try {
			libWrapper.register(MODULE_ID, target, fn, type, { perf_mode: perf });
			return true;
		} catch {
			/* try next descriptor */
		}
	}
	console.error(`[${MODULE_ID}] ${label}: no libWrapper target matched`, targets);
	return false;
}

/** @returns {string[]} */
export function getItemGetChatDataTargets() {
	return ["CONFIG.Item.documentClass.prototype.getChatData"];
}

/** @param {string} key */
function libWrapperIndexKey(key) {
	const escaped = String(key).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	return `["${escaped}"]`;
}

/**
 * @param {string} actorType
 * @param {string} sheetId
 * @param {string} method
 */
function sheetClassTarget(actorType, sheetId, method) {
	const typeKey = /^[A-Za-z_][\w$]*$/.test(actorType) ? `.${actorType}` : libWrapperIndexKey(actorType);
	return `CONFIG.Actor.sheetClasses${typeKey}${libWrapperIndexKey(sheetId)}.cls.prototype.${method}`;
}

/**
 * CONFIG.Actor.sheetClasses entries for the base PC sheet class (ActorSheet4e).
 * Call from the setup hook — libWrapper.Ready runs during Game.initialize before system init registers sheets.
 *
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 * @param {string} method
 * @returns {string[]}
 */
export function getActorSheet4eMethodTargets(ActorSheet4e, method) {
	const targets = [];
	const className = ActorSheet4e?.name ?? "ActorSheet4e";
	const actorTypes = new Set([
		...Object.keys(CONFIG.Actor?.sheetClasses ?? {}),
		...Object.keys(CONFIG.Actor?.dataModels ?? {})
	]);

	const DSC = foundry.applications.apps?.DocumentSheetConfig;
	if (DSC?.getSheetClassesForSubType) {
		for (const actorType of actorTypes) {
			try {
				const { sheetClasses } = DSC.getSheetClassesForSubType("Actor", actorType);
				for (const [sheetId, entry] of Object.entries(sheetClasses ?? {})) {
					if (entry?.cls !== ActorSheet4e) continue;
					targets.push(sheetClassTarget(actorType, sheetId, method));
				}
			} catch {
				/* unknown actor subtype */
			}
		}
	}

	for (const [actorType, byId] of Object.entries(CONFIG.Actor?.sheetClasses ?? {})) {
		for (const [sheetId, entry] of Object.entries(byId ?? {})) {
			if (entry?.cls !== ActorSheet4e) continue;
			targets.push(sheetClassTarget(actorType, sheetId, method));
		}
	}

	targets.push(
		sheetClassTarget("Player Character", className, method),
		sheetClassTarget("Player Character", `dnd4e.${className}`, method)
	);

	return [...new Set(targets)];
}

/** changeTab lives on ActorSheetV2; guard wrapper with instanceof ActorSheet4e. */
export function getActorSheetV2ChangeTabTargets() {
	return ["foundry.applications.sheets.ActorSheetV2.prototype.changeTab"];
}
