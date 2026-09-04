/**
 * libWrapper: target must be a descriptor string (or numeric id), not a function reference.
 */

import { MODULE_ID } from "../constants.js";

/**
 * @param {string} descriptor
 * @returns {unknown}
 */
export function resolveLibWrapperDescriptor(descriptor) {
	try {
		// eslint-disable-next-line no-new-func
		return new Function(`return ${descriptor}`)();
	} catch {
		return undefined;
	}
}

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
	const resolved = targets.filter((t) => {
		const val = resolveLibWrapperDescriptor(t);
		return typeof val === "function";
	});
	const tryList = resolved.length ? resolved : targets;

	for (const target of tryList) {
		try {
			libWrapper.register(MODULE_ID, target, fn, type, { perf_mode: perf });
			return true;
		} catch {
			/* try next descriptor */
		}
	}
	if (!opts.quiet) {
		console.warn(
			`[${MODULE_ID}] ${label}: libWrapper register failed (${tryList.length} targets).`,
			tryList
		);
	}
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
 * @param {Function} cls
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
function isDnd4eActorSheetClass(cls, ActorSheet4e) {
	return Boolean(cls?.prototype && ActorSheet4e?.prototype && cls.prototype instanceof ActorSheet4e);
}

/**
 * CONFIG.Actor.sheetClasses for ActorSheet4e and subclasses (e.g. fox-4e-styling.Fox4eSheet).
 * Call from the ready hook so all modules have registered sheets.
 *
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
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
					if (!isDnd4eActorSheetClass(entry?.cls, ActorSheet4e)) continue;
					targets.push(sheetClassTarget(actorType, sheetId, method));
				}
			} catch {
				/* unknown actor subtype */
			}
		}
	}

	for (const [actorType, byId] of Object.entries(CONFIG.Actor?.sheetClasses ?? {})) {
		for (const [sheetId, entry] of Object.entries(byId ?? {})) {
			if (!isDnd4eActorSheetClass(entry?.cls, ActorSheet4e)) continue;
			targets.push(sheetClassTarget(actorType, sheetId, method));
		}
	}

	targets.push(
		sheetClassTarget("Player Character", className, method),
		sheetClassTarget("Player Character", `dnd4e.${className}`, method)
	);

	const unique = [...new Set(targets)];
	unique.sort((a, b) => {
		const aBase = a.includes(`["${className}"]`) || a.includes(`["dnd4e.${className}"]`);
		const bBase = b.includes(`["${className}"]`) || b.includes(`["dnd4e.${className}"]`);
		if (aBase && !bBase) return -1;
		if (!aBase && bBase) return 1;
		return 0;
	});
	return unique;
}

/** changeTab lives on ApplicationV2; guard wrapper with instanceof ActorSheet4e. */
export function getActorSheetV2ChangeTabTargets() {
	return [
		"foundry.applications.api.ApplicationV2.prototype.changeTab",
		"foundry.applications.sheets.ActorSheetV2.prototype.changeTab"
	];
}
