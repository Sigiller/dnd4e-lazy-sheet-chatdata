/**
 * libWrapper: target must be a descriptor string (or numeric id), not a function reference.
 *
 * A target is either a plain dotted path (resolved with foundry.utils.getProperty) or a
 * `{ descriptor, value }` pair for the sheet-class descriptors, which need bracket notation and
 * are resolved by indexing CONFIG directly. Nothing here parses or evals a path.
 */

import { MODULE_ID } from "../constants.js";

/**
 * @typedef {{ descriptor: string, value: unknown }} LibWrapperTarget
 * @param {string | LibWrapperTarget} target
 * @returns {LibWrapperTarget}
 */
function normalizeTarget(target) {
	if (typeof target !== "string") return target;
	return { descriptor: target, value: foundry.utils.getProperty(globalThis, target) };
}

/**
 * Register `fn` on the first target that libWrapper accepts.
 *
 * @param {string} label
 * @param {(string | LibWrapperTarget)[]} targets
 * @param {function} fn
 * @param {{ type?: number, perf_mode?: number, quiet?: boolean }} [opts]
 * @returns {boolean}
 */
export function registerLibWrapperFirst(label, targets, fn, opts = {}) {
	const type = opts.type ?? libWrapper.WRAPPER;
	const perf = opts.perf_mode ?? libWrapper.PERF_NORMAL;
	const all = targets.map(normalizeTarget);
	const resolved = all.filter((t) => typeof t.value === "function");
	const tryList = (resolved.length ? resolved : all).map((t) => t.descriptor);

	for (const descriptor of tryList) {
		try {
			libWrapper.register(MODULE_ID, descriptor, fn, type, { perf_mode: perf });
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

/** @param {string} method @returns {string[]} */
export function getItemMethodTargets(method) {
	return [`CONFIG.Item.documentClass.prototype.${method}`];
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
 * @returns {LibWrapperTarget[]}
 */
export function getActorSheet4eMethodTargets(ActorSheet4e, method) {
	/** @type {LibWrapperTarget[]} */
	const targets = [];
	const className = ActorSheet4e?.name ?? "ActorSheet4e";

	// Resolve through the same path the descriptor names, so a guessed path that does not exist
	// stays unresolved instead of borrowing a class we happen to hold.
	const add = (actorType, sheetId) => {
		targets.push({
			descriptor: sheetClassTarget(actorType, sheetId, method),
			value: CONFIG.Actor?.sheetClasses?.[actorType]?.[sheetId]?.cls?.prototype?.[method]
		});
	};

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
					add(actorType, sheetId);
				}
			} catch {
				/* unknown actor subtype */
			}
		}
	}

	for (const [actorType, byId] of Object.entries(CONFIG.Actor?.sheetClasses ?? {})) {
		for (const [sheetId, entry] of Object.entries(byId ?? {})) {
			if (!isDnd4eActorSheetClass(entry?.cls, ActorSheet4e)) continue;
			add(actorType, sheetId);
		}
	}

	// Last-resort descriptors for the stock sheet ids, in case the catalog above is empty.
	add("Player Character", className);
	add("Player Character", `dnd4e.${className}`);

	const seen = new Set();
	const unique = targets.filter((t) => !seen.has(t.descriptor) && seen.add(t.descriptor));
	const isBase = (t) =>
		t.descriptor.includes(`["${className}"]`) || t.descriptor.includes(`["dnd4e.${className}"]`);
	unique.sort((a, b) => Number(isBase(b)) - Number(isBase(a)));
	return unique;
}

/** changeTab lives on ApplicationV2; guard wrapper with instanceof ActorSheet4e. */
export function getActorSheetV2ChangeTabTargets() {
	return [
		"foundry.applications.api.ApplicationV2.prototype.changeTab",
		"foundry.applications.sheets.ActorSheetV2.prototype.changeTab"
	];
}
