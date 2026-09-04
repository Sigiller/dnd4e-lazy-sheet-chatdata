#!/usr/bin/env node
/**
 * Import the real module graph against a minimal Foundry stub and run every register* function.
 *
 * Catches what a static grep cannot: a stale import after a rename, a libWrapper target that no
 * longer resolves, and a settings key read on the prep hot path that nobody registered (the stub's
 * `game.settings.get` throws for unregistered keys).
 *
 * Replaces the old verify-getchatdata-sync.mjs, which only proved that
 * lib/get-chat-data-sheet-list-fast.js was a byte-for-byte copy of Item4e.getChatData — that copy
 * is gone; the wrapper calls `wrapped` instead.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {Record<string, Function[]>} */
const onceHooks = {};
/** @type {Record<string, Function[]>} */
const onHooks = {};
globalThis.Hooks = {
	once: (name, fn) => (onceHooks[name] ??= []).push(fn),
	on: (name, fn) => (onHooks[name] ??= []).push(fn),
	_hooks: {}
};

const settingDefs = new Map();
const settingReads = new Set();
globalThis.game = {
	// Flipped to true just before the `ready` hooks run, mirroring Foundry.
	ready: false,
	system: { id: "dnd4e", version: "0.9.2" },
	user: { isGM: true },
	world: { id: "verify" },
	modules: [],
	actors: [],
	settings: {
		register: (mod, key, def) => settingDefs.set(`${mod}.${key}`, def),
		get: (mod, key) => {
			const id = `${mod}.${key}`;
			settingReads.add(id);
			if (!settingDefs.has(id)) throw new Error(`read of unregistered setting ${id}`);
			return settingDefs.get(id).default;
		}
	}
};

class ApplicationV2 {
	changeTab() {}
	async _renderHTML() {}
}
class ActorSheetV2 extends ApplicationV2 {}
class ActorSheet4e extends ActorSheetV2 {
	static DEFAULT_OPTIONS = { actions: { itemSummary() {} } };
	static TABS = { sheet: { initial: "powers" } };
	async _prepareContext() {
		return { items: [] };
	}
}
class Item4e {
	async getChatData() {
		return {};
	}
	async roll() {}
	async toChat() {}
}

globalThis.CONFIG = {
	Item: { documentClass: Item4e },
	Actor: {
		sheetClasses: { "Player Character": { "dnd4e.ActorSheet4e": { cls: ActorSheet4e } } },
		dataModels: {}
	},
	debug: { hooks: false }
};
globalThis.foundry = {
	applications: {
		api: { ApplicationV2 },
		sheets: { ActorSheetV2 },
		apps: {},
		ux: { TextEditor: { implementation: { async enrichHTML(html) { return html; } } } }
	},
	utils: {
		getProperty: (obj, p) => p.split(".").reduce((acc, key) => acc?.[key], obj),
		duplicate: (o) => structuredClone(o),
		isNewerVersion: () => false
	}
};
globalThis.dnd4e = { applications: { sheets: { ActorSheet4e } }, utils: {} };

const registeredTargets = [];
globalThis.libWrapper = {
	WRAPPER: 1,
	MIXED: 2,
	OVERRIDE: 3,
	PERF_NORMAL: 0,
	register: (_mod, target, _fn, _type) => {
		if (foundry.utils.getProperty(globalThis, target) === undefined && !target.includes("[")) {
			throw new Error(`unresolvable target ${target}`);
		}
		registeredTargets.push(target);
	}
};
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.document = { createElement: () => ({ set innerHTML(_v) {}, content: {} }) };

const problems = [];
const quietLog = console.log;
console.log = () => {};
console.warn = (...args) => problems.push(`console.warn: ${args[0]}`);
console.error = (...args) => problems.push(`console.error: ${args[0]}`);

try {
	await import(path.join(moduleRoot, "main.js"));
	// Foundry's real order: libWrapper fires libWrapper.Ready from Game#initialize, BEFORE `init`
	// registers any setting. Anything reading game.settings at libWrapper.Ready time throws —
	// the stub's getter above turns that into a failure instead of a silent console error.
	for (const name of ["libWrapper.Ready", "init", "setup", "ready"]) {
		if (name === "ready") game.ready = true;
		for (const fn of onceHooks[name] ?? []) await fn();
	}
} catch (e) {
	problems.push(`import/hook threw: ${e?.stack ?? e}`);
}
console.log = quietLog;

const expectPatched = [
	"getChatData",
	"roll",
	"toChat",
	"enrichHTML",
	"changeTab",
	"_prepareContext"
];
for (const method of expectPatched) {
	if (!registeredTargets.some((t) => t.endsWith(`.${method}`))) {
		problems.push(`no libWrapper registration ending in .${method}`);
	}
}
for (const hook of ["renderActorSheetV2", "closeApplicationV2"]) {
	if (!onHooks[hook]?.length) problems.push(`no listener on ${hook}`);
}
if (settingDefs.get("dnd4e-lazy-sheet-chatdata.sheetPerfTimingHooks")?.default !== false) {
	problems.push("sheetPerfTimingHooks must default to false (it instruments every render)");
}

const report = {
	allPass: problems.length === 0,
	settingsRegistered: [...settingDefs.keys()].map((k) => k.split(".").slice(1).join(".")),
	settingsReadAtStartup: [...settingReads].map((k) => k.split(".").slice(1).join(".")),
	libWrapperTargets: registeredTargets,
	renderHooks: Object.keys(onHooks),
	problems
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.allPass ? 0 : 1);
