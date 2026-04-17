/**
 * Foundry v13 — Character sheet (ActorSheetV2) performance probe (dnd4e).
 * Shipped inside dnd4e-lazy-sheet-chatdata; previously a standalone sheet-perf-probe module.
 *
 * API on globalThis (after ready): sheetPerfLog, sheetPerfBaseline(), sheetPerfMigration(), sheetPerfActorAudit(actor),
 * sheetPerfBisectHelp({ half: 'first'|'second' }), sheetPerfEnableDebugHooks(bool), sheetPerfHookTimings(hookName),
 * sheetPerfClearMeasures(), sheetPerfBenchmarkActor(opts), sheetPerfPrewarmActor(opts), sheetPerfBreakdownActor(actor|id, opts),
 * sheetPerfProfileGetChatDataPhases(item|id, opts) — phased breakdown of getChatData for one item (dnd4e).
 */

import { MODULE_ID } from "../constants.js";
const LOG_CAP = 200;

/** @type {{ t: number, kind: string, msg: string, data?: object }[]} */
const sheetPerfLog = [];

function log(kind, msg, data) {
	const row = { t: performance.now(), kind, msg, data };
	sheetPerfLog.push(row);
	if (sheetPerfLog.length > LOG_CAP) sheetPerfLog.splice(0, sheetPerfLog.length - LOG_CAP);
	if (game?.settings?.get(MODULE_ID, "sheetPerfProbeQuiet") === true) return;
	console.log(`[${MODULE_ID}]`, msg, data ?? "");
}

function isActorSheetV2App(app) {
	if (!app?.constructor) return false;
	const C = foundry.applications.sheets?.ActorSheetV2;
	return Boolean(C && app instanceof C);
}

function registerSettings() {
	game.settings.register(MODULE_ID, "sheetPerfProbeQuiet", {
		name: "[dev] Sheet perf probe: quiet console",
		hint: "Do not console.log from the probe (sheetPerfLog still fills).",
		scope: "client",
		config: true,
		type: Boolean,
		default: false
	});
}

function sheetPerfBaseline() {
	const active = game.modules.filter((m) => m.active).map((m) => ({
		id: m.id,
		title: m.title,
		version: m.version
	}));
	const world = game.world;
	const safe = world?.safeMode ?? world?.flags?.core?.safeMode ?? game.data?.safeMode;
	log("baseline", "Active modules", { count: active.length, ids: active.map((m) => m.id) });
	console.table(active);
	console.log(`[${MODULE_ID}] World: ${world?.id}  system: ${game.system?.id}@${game.system?.version}`);
	console.log(`[${MODULE_ID}] game.data.safeMode / world safeMode:`, safe);
	console.log(
		`[${MODULE_ID}] To trace hook order: sheetPerfEnableDebugHooks(true)  (noisy — turn off after: sheetPerfEnableDebugHooks(false))`
	);
	return { active, safeMode: safe };
}

function sheetPerfMigration() {
	const sys = game.system;
	const cv =
		game.settings.get("dnd4e", "systemMigrationVersion") ?? game.world?.flags?.dnd4e?.version ?? "(unset)";
	const needs = sys?.flags?.needsMigrationVersion ?? "(n/a)";
	const compat = sys?.flags?.compatibleMigrationVersion ?? "(n/a)";
	const out = {
		systemId: sys?.id,
		systemVersion: sys?.version,
		systemMigrationVersion: cv,
		needsMigrationVersion: needs,
		compatibleMigrationVersion: compat
	};
	log("migration", "dnd4e migration markers", out);
	console.log(`[${MODULE_ID}] migration`, out);
	if (sys?.id === "dnd4e" && cv !== "(unset)" && foundry.utils.isNewerVersion(sys.version, cv)) {
		console.warn(
			`[${MODULE_ID}] system version ${sys.version} is newer than last migration stamp ${cv} — next GM ready may run migrateWorld().`
		);
	}
	return out;
}

function _jsonSize(obj) {
	try {
		return JSON.stringify(obj).length;
	} catch {
		return -1;
	}
}

function _countKeysDeep(o, maxKeys = 50000) {
	let n = 0;
	const walk = (v) => {
		if (n >= maxKeys) return;
		if (v && typeof v === "object") {
			if (Array.isArray(v)) {
				for (const x of v) {
					walk(x);
					if (n >= maxKeys) return;
				}
			} else {
				for (const k of Object.keys(v)) {
					n++;
					if (n >= maxKeys) return;
					walk(v[k]);
				}
			}
		}
	};
	walk(o);
	return n >= maxKeys ? `${maxKeys}+` : n;
}

function buildActorAuditReport(actor) {
	if (!actor) return null;
	const plain = actor.toObject(false);
	const items = actor.items?.size ?? actor.items?.length ?? 0;
	return {
		id: actor.id,
		name: actor.name,
		type: actor.type,
		itemCount: items,
		toObjectJsonChars: _jsonSize(plain),
		systemJsonChars: _jsonSize(plain.system),
		flagsJsonChars: _jsonSize(plain.flags),
		approxDeepKeyCount: _countKeysDeep(plain)
	};
}

/**
 * @param {Actor} actor
 */
function sheetPerfActorAudit(actor) {
	if (!actor) {
		console.error(`[${MODULE_ID}] Pass an Actor document, e.g. sheetPerfActorAudit(game.actors.getName('Bob'))`);
		return null;
	}
	const report = buildActorAuditReport(actor);
	log("audit", `Actor audit ${actor.name}`, report);
	console.log(`[${MODULE_ID}] actor audit`, report);
	return report;
}

/**
 * @param {{ half?: 'first'|'second' }} [opts]
 */
function sheetPerfBisectHelp(opts = {}) {
	const ids = game.modules.filter((m) => m.active).map((m) => m.id);
	const half = opts.half === "second" ? "second" : "first";
	const mid = Math.ceil(ids.length / 2);
	const slice = half === "first" ? ids.slice(0, mid) : ids.slice(mid);
	console.log(`[${MODULE_ID}] Bisection (${half} half, ${slice.length} of ${ids.length} active).`);
	console.log(`[${MODULE_ID}] Disable these in Setup → Manage Modules, reload, re-measure sheet open:`);
	console.log(JSON.stringify(slice, null, 0));
	console.log(
		`[${MODULE_ID}] Repeat halving the suspect set. Compare sheetPerfLog / Performance panel p95 after each step.`
	);
	return { half, disableSuggestion: slice };
}

function sheetPerfEnableDebugHooks(on) {
	CONFIG.debug.hooks = Boolean(on);
	log("debug", `CONFIG.debug.hooks = ${CONFIG.debug.hooks}`);
}

/**
 * Wrap each listener for a hook to log cumulative time (dev only).
 * @param {string} hookName
 */
function sheetPerfHookTimings(hookName) {
	const raw = Hooks._hooks?.[hookName];
	if (!raw) {
		console.warn(`[${MODULE_ID}] No hook bucket for: ${hookName}`);
		return;
	}
	const list = Array.isArray(raw) ? raw : Array.isArray(raw._) ? raw._ : null;
	if (!list) {
		console.warn(`[${MODULE_ID}] Unexpected Hooks._hooks shape for ${hookName}`, raw);
		return;
	}
	if (list.__sheetPerfWrapped) {
		console.warn(`[${MODULE_ID}] Already wrapped ${hookName}`);
		return;
	}
	const wrapFn = (fn) => {
		const wrapped = (...args) => {
			const t0 = performance.now();
			try {
				return fn(...args);
			} finally {
				const dt = performance.now() - t0;
				if (dt > 1) log("hook", `${hookName} ${fn.name || "anon"}`, { ms: Number(dt.toFixed(2)) });
			}
		};
		Object.defineProperty(wrapped, "name", { value: fn.name || "wrappedListener" });
		return wrapped;
	};
	const originals = list.slice();
	list.length = 0;
	for (const entry of originals) {
		if (typeof entry === "function") {
			list.push(wrapFn(entry));
			continue;
		}
		const inner = entry?.fn ?? entry?.listener;
		if (typeof inner === "function") list.push({ ...entry, fn: wrapFn(inner) });
		else list.push(entry);
	}
	list.__sheetPerfWrapped = true;
	console.log(`[${MODULE_ID}] Wrapped ${list.length} listeners on ${hookName} (logs >1ms)`);
}

function sheetPerfClearMeasures() {
	performance.clearMarks();
	performance.clearMeasures();
	log("perf", "cleared marks/measures");
}

function _percentile(sorted, p) {
	if (!sorted.length) return null;
	const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
	return sorted[idx];
}

/**
 * Several open/close cycles; optionally wraps sheetPerfHookTimings('renderActorSheetV2').
 * @param {{ actorId?: string, actorName?: string, iterations?: number, wrapHooks?: boolean }} [opts]
 */
async function sheetPerfBenchmarkActor(opts = {}) {
	await new Promise((resolve) => {
		if (globalThis.libWrapper?.register) resolve();
		else if (typeof Hooks !== "undefined") Hooks.once("libWrapper.Ready", resolve);
		else resolve();
	});

	const iterations = Math.min(50, Math.max(1, Number(opts.iterations) || 7));
	const actorId = opts.actorId;
	const actorName = opts.actorName;
	let actor = actorId ? game.actors.get(actorId) : null;
	if (!actor && actorName) actor = game.actors.getName(actorName);
	if (!actor) actor = game.actors.find((a) => a.type === "character");
	if (!actor) {
		const err = { error: "no_actor", hint: "Set actorId/actorName or add a PC to the world" };
		log("benchmark", "failed", err);
		return err;
	}

	if (opts.wrapHooks !== false && typeof sheetPerfHookTimings === "function") {
		try {
			sheetPerfHookTimings("renderActorSheetV2");
		} catch (e) {
			log("benchmark", "sheetPerfHookTimings skipped", { err: String(e?.message ?? e) });
		}
	}

	const samples = [];
	const logStart = sheetPerfLog.length;

	for (let i = 0; i < iterations; i++) {
		const t0 = performance.now();
		await actor.sheet?.render(true);
		await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
		const t1 = performance.now();
		const wallMs = t1 - t0;
		samples.push(wallMs);
		log("benchmark", `iter ${i + 1}/${iterations} open+rAF×2`, { ms: Number(wallMs.toFixed(2)), actor: actor.name });
		try {
			if (actor.sheet?.rendered) await actor.sheet.close({ animate: false });
		} catch (e) {
			log("benchmark", "close warning", { err: String(e?.message ?? e) });
		}
		await new Promise((r) => setTimeout(r, 150));
	}

	const sorted = [...samples].sort((a, b) => a - b);
	const firstOpenMs = samples[0];
	const warm = samples.slice(1);
	const warmSorted = [...warm].sort((a, b) => a - b);
	const warmMedian = warmSorted.length ? _percentile(warmSorted, 0.5) : null;
	const warmP95 = warmSorted.length ? _percentile(warmSorted, 0.95) : null;
	const out = {
		actorId: actor.id,
		actorName: actor.name,
		iterations,
		samplesMs: samples.map((x) => Number(x.toFixed(2))),
		/** First open in the series (often “cold”). */
		firstOpenMs: Number(firstOpenMs.toFixed(2)),
		/** Median of opens 2…N (excluding the first). */
		subsequentMedianMs: warmMedian != null ? Number(warmMedian.toFixed(2)) : null,
		subsequentP95Ms: warmP95 != null ? Number(warmP95.toFixed(2)) : null,
		firstToWarmMedianRatio:
			warmMedian != null && warmMedian > 0 ? Number((firstOpenMs / warmMedian).toFixed(2)) : null,
		minMs: sorted[0],
		p50Ms: _percentile(sorted, 0.5),
		p95Ms: _percentile(sorted, 0.95),
		maxMs: sorted[sorted.length - 1],
		actorAudit: buildActorAuditReport(actor),
		sheetPerfLogSlice: sheetPerfLog.slice(logStart)
	};
	log("benchmark", "summary", {
		actor: actor.name,
		firstOpenMs: out.firstOpenMs,
		subsequentMedianMs: out.subsequentMedianMs,
		p50Ms: out.p50Ms,
		p95Ms: out.p95Ms,
		minMs: out.minMs,
		maxMs: out.maxMs
	});
	return out;
}

/**
 * Open and close the sheet once (warm templates/HB cache and heavy getData) — handy from a macro after GM login.
 * @param {{ actorId?: string, actorName?: string }} [opts]
 */
async function sheetPerfPrewarmActor(opts = {}) {
	const actorId = opts?.actorId;
	const actorName = opts?.actorName;
	let actor = actorId ? game.actors.get(actorId) : null;
	if (!actor && actorName) actor = game.actors.getName(actorName);
	if (!actor) actor = game.actors.find((a) => a.type === "character");
	if (!actor) {
		log("prewarm", "failed", { error: "no_actor" });
		return { ok: false, error: "no_actor" };
	}
	const t0 = performance.now();
	await actor.sheet?.render(true);
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
	if (actor.sheet?.rendered) await actor.sheet.close({ animate: false });
	const ms = performance.now() - t0;
	log("prewarm", `done ${actor.name}`, { ms: Number(ms.toFixed(2)) });
	return { ok: true, actorId: actor.id, actorName: actor.name, wallMs: Number(ms.toFixed(2)) };
}

function registerSheetTimingHooks() {
	Hooks.on("preRenderApplication", (app, data) => {
		if (!isActorSheetV2App(app)) return;
		const actorId = app.document?.id ?? "na";
		const seq = (app._sheetPerfSeq = (app._sheetPerfSeq || 0) + 1);
		const base = `sheetPerf.${actorId}.${seq}`;
		app._sheetPerfBase = base;
		performance.mark(`${base}:preRender`);
	});

	const afterPaint = (app) => {
		const base = app?._sheetPerfBase;
		if (!base) return;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				try {
					performance.mark(`${base}:paint`);
					performance.measure(`${base}.open`, `${base}:preRender`, `${base}:paint`);
					const m = performance.getEntriesByName(`${base}.open`, "measure").at(-1);
					const name = app.document?.name ?? app.document?.id ?? "?";
					log("sheet", `ActorSheetV2 open (rAF×2)`, {
						actor: name,
						durationMs: m ? Number(m.duration.toFixed(2)) : null
					});
				} catch (e) {
					console.warn(`[${MODULE_ID}] measure failed`, e);
				}
			});
		});
	};

	Hooks.on("renderActorSheetV2", (app, html, data) => {
		if (!isActorSheetV2App(app)) return;
		const base = app._sheetPerfBase;
		if (base) performance.mark(`${base}:renderHook`);
		afterPaint(app);
	});
}

/**
 * Try libWrapper on known ApplicationV2 render internals (v13).
 */
export function registerSheetPerfLibWrapperProbes() {
	const ASV2 = foundry.applications.sheets?.ActorSheetV2;
	const candidates = [
		"foundry.applications.api.ApplicationV2.prototype._renderHTML",
		"foundry.applications.sheets.ActorSheetV2.prototype._renderHTML"
	];
	const registered = [];
	for (const target of candidates) {
		try {
			libWrapper.register(
				MODULE_ID,
				target,
				async function (wrapped, ...args) {
					const app = this;
					if (!ASV2 || !(app instanceof ASV2)) return wrapped.apply(this, args);
					const mark = `ActorSheetV2._renderHTML#${app.document?.id ?? "?"}#${performance.now()}`;
					performance.mark(`${mark}:start`);
					try {
						return await wrapped.apply(this, args);
					} finally {
						performance.mark(`${mark}:end`);
						try {
							performance.measure(mark, `${mark}:start`, `${mark}:end`);
							const m = performance.getEntriesByName(mark, "measure").at(-1);
							if (m && m.duration > 5)
								log("core", target, {
									actor: app.document?.name,
									durationMs: Number(m.duration.toFixed(2))
								});
						} catch {
							/* ignore measure errors */
						}
					}
				},
				libWrapper.WRAPPER,
				{ perf_mode: libWrapper.PERF_NORMAL }
			);
			registered.push(target);
			break;
		} catch (e) {
			log("core-skip", target, { err: String(e?.message ?? e) });
		}
	}
	if (!registered.length)
		console.warn(
			`[${MODULE_ID}] No libWrapper target registered — check core path for ApplicationV2._renderHTML in DevTools.`
		);
	else console.log(`[${MODULE_ID}] libWrapper registered:`, registered);
}

/** @type {null | object} */
let sheetPerfLastBreakdown = null;
let _sheetPerfBreakdownLock = false;

function _restorePatches(restorers) {
	for (const fn of restorers) {
		try {
			fn();
		} catch (e) {
			console.warn(`[${MODULE_ID}] breakdown restore`, e);
		}
	}
}

/**
 * One sheet open with timing for Item.getChatData (this actor’s items only)
 * and TextEditor.implementation.enrichHTML (relativeTo === this actor only).
 * Shows which data paths dominate dnd4e _prepareContext (item loop + biography enrich, etc.).
 *
 * @param {Actor|string} actorRef
 * @param {{ closeAfter?: boolean }} [opts]
 */
async function sheetPerfBreakdownActor(actorRef, opts = {}) {
	if (game.system?.id !== "dnd4e") {
		const err = { error: "dnd4e_only", hint: "Breakdown hooks target CONFIG.Item.documentClass + TextEditor" };
		log("breakdown", "skip", err);
		return err;
	}
	if (_sheetPerfBreakdownLock) {
		return { error: "busy", hint: "Another breakdown is running" };
	}
	_sheetPerfBreakdownLock = true;
	const closeAfter = opts.closeAfter !== false;

	const actor =
		typeof actorRef === "string"
			? game.actors.get(actorRef) ?? game.actors.getName(actorRef)
			: actorRef;
	if (!actor) {
		_sheetPerfBreakdownLock = false;
		return { error: "no_actor" };
	}

	const ItemCls = CONFIG.Item?.documentClass;
	if (!ItemCls?.prototype?.getChatData) {
		_sheetPerfBreakdownLock = false;
		return { error: "no_item_class" };
	}

	const getChatRows = [];
	const enrichRows = [];
	const restorers = [];

	const origGetChat = ItemCls.prototype.getChatData;
	ItemCls.prototype.getChatData = async function (...args) {
		if (this.actor?.id !== actor.id) return await origGetChat.apply(this, args);
		const t0 = performance.now();
		try {
			return await origGetChat.apply(this, args);
		} finally {
			getChatRows.push({
				id: this.id,
				name: this.name,
				type: this.type,
				ms: Number((performance.now() - t0).toFixed(2))
			});
		}
	};
	restorers.push(() => {
		ItemCls.prototype.getChatData = origGetChat;
	});

	const impl = foundry.applications.ux?.TextEditor?.implementation;
	if (impl?.enrichHTML) {
		const origEnrich = impl.enrichHTML;
		impl.enrichHTML = async function (html, options) {
			const rel = options?.relativeTo;
			if (!rel || rel.id !== actor.id) return await origEnrich.call(this, html, options);
			const t0 = performance.now();
			try {
				return await origEnrich.call(this, html, options);
			} finally {
				enrichRows.push({
					ms: Number((performance.now() - t0).toFixed(2)),
					htmlChars: typeof html === "string" ? html.length : 0
				});
			}
		};
		restorers.push(() => {
			impl.enrichHTML = origEnrich;
		});
	}

	let sheetOpenMs = null;
	try {
		const t0 = performance.now();
		await actor.sheet?.render(true);
		await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
		sheetOpenMs = Number((performance.now() - t0).toFixed(2));
	} finally {
		_restorePatches(restorers);
		_sheetPerfBreakdownLock = false;
		if (closeAfter && actor.sheet?.rendered) {
			try {
				await actor.sheet.close({ animate: false });
			} catch {
				/* */
			}
		}
	}

	const byType = {};
	let getChatSum = 0;
	for (const r of getChatRows) {
		getChatSum += r.ms;
		byType[r.type] = (byType[r.type] || 0) + r.ms;
	}
	const enrichSum = enrichRows.reduce((s, r) => s + r.ms, 0);

	const topItems = [...getChatRows].sort((a, b) => b.ms - a.ms).slice(0, 50);
	const heaviestItems = topItems.map((row, i) => ({
		rank: i + 1,
		id: row.id,
		name: row.name,
		type: row.type,
		getChatDataMs: row.ms
	}));
	const out = {
		actorId: actor.id,
		actorName: actor.name,
		sheetOpenMs,
		/** Slowest Item.getChatData calls during one sheet open. */
		heaviestItems,
		getChatData: {
			callCount: getChatRows.length,
			totalMs: Number(getChatSum.toFixed(2)),
			sumByItemTypeMs: Object.fromEntries(
				Object.entries(byType)
					.map(([k, v]) => [k, Number(v.toFixed(2))])
					.sort((a, b) => b[1] - a[1])
			),
			topCalls: topItems
		},
		enrichHTML: {
			callCount: enrichRows.length,
			totalMs: Number(enrichSum.toFixed(2)),
			avgMs:
				enrichRows.length > 0 ? Number((enrichSum / enrichRows.length).toFixed(2)) : 0,
			largestCalls: [...enrichRows].sort((a, b) => b.ms - a.ms).slice(0, 15)
		},
		hint: "getChatData — item loop in ActorSheet4e._prepareContext; enrichHTML — biography/descriptions and power cards. For the rest use sheetPerfHookTimings + Performance."
	};

	sheetPerfLastBreakdown = out;
	log("breakdown", "sheet load attribution (dnd4e)", {
		sheetOpenMs: out.sheetOpenMs,
		getChatTotalMs: out.getChatData.totalMs,
		enrichTotalMs: out.enrichHTML.totalMs,
		topTypes: out.getChatData.sumByItemTypeMs
	});
	console.log(`[${MODULE_ID}] Heaviest items (getChatData)`);
	console.table(heaviestItems.slice(0, 25));
	console.log(`[${MODULE_ID}] sheetPerfLastBreakdown (full)`, out);
	return out;
}

/** @type {null | object} */
let sheetPerfLastPhaseProfile = null;

/**
 * Phased breakdown of dnd4e Item.getChatData for one item (no prototype patch).
 * Mirrors systems/dnd4e/module/item/item.js#getChatData with the same htmlOptions as ActorSheet4e:
 * `{ secrets: actor.isOwner }` (no relativeTo) — so enrich inside getChatData is not counted in sheetPerfBreakdownActor.
 *
 * @param {Item|string} itemRef — Item document or id (world items or embedded on any loaded actor)
 * @param {{ htmlOptions?: object }} [opts]
 * @returns {Promise<object|null>}
 */
function _resolveItemByIdOrName(idOrName) {
	const w = game.items.get(idOrName) ?? game.items.getName(idOrName);
	if (w) return w;
	for (const a of game.actors) {
		const it = a.items.get(idOrName) ?? a.items.getName(idOrName);
		if (it) return it;
	}
	return null;
}

async function sheetPerfProfileGetChatDataPhases(itemRef, opts = {}) {
	if (game.system?.id !== "dnd4e") {
		console.warn(`[${MODULE_ID}] sheetPerfProfileGetChatDataPhases: dnd4e only`);
		return null;
	}
	const Helper = game.helper;
	if (!Helper?.getWeaponUse || !Helper?.commonReplace) {
		console.warn(`[${MODULE_ID}] sheetPerfProfileGetChatDataPhases: no game.helper (dnd4e not ready?)`);
		return null;
	}

	const item =
		typeof itemRef === "string" ? _resolveItemByIdOrName(itemRef) : itemRef;
	if (!item) {
		console.warn(`[${MODULE_ID}] sheetPerfProfileGetChatDataPhases: item not found`);
		return null;
	}
	const actor = item.actor;
	const htmlOptions = opts.htmlOptions ?? { secrets: Boolean(actor?.isOwner) };

	const description = item.system?.description?.value || "";
	const descLen = description.length;

	let t = performance.now();
	const dataDup = foundry.utils.duplicate(item.system);
	const duplicateMs = performance.now() - t;

	t = performance.now();
	const labels = item.labels;
	const labelsReadMs = performance.now() - t;

	t = performance.now();
	const weaponUse = Helper.getWeaponUse(dataDup, actor);
	const getWeaponUseMs = performance.now() - t;

	t = performance.now();
	const descriptionText = description
		? Helper.commonReplace(description, actor, item.system, weaponUse?.system)
		: description;
	const commonReplaceMs = performance.now() - t;
	const afterReplaceLen = typeof descriptionText === "string" ? descriptionText.length : 0;

	const enrichOpts = { ...htmlOptions, async: true };
	t = performance.now();
	let enriched = "";
	try {
		enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
			descriptionText,
			enrichOpts
		);
	} catch (e) {
		console.warn(`[${MODULE_ID}] enrichHTML failed`, e);
	}
	const enrichHTMLMs = performance.now() - t;
	const enrichedHtmlChars = typeof enriched === "string" ? enriched.length : 0;

	t = performance.now();
	const props = [];
	const fn = item[`_${item.type}ChatData`];
	if (typeof fn === "function") fn.call(item, dataDup, labels, props);
	const typeChatDataMs = performance.now() - t;

	t = performance.now();
	const fullChatData = await item.getChatData(htmlOptions);
	const fullGetChatDataMs = performance.now() - t;

	const out = {
		itemId: item.id,
		itemName: item.name,
		itemType: item.type,
		actorId: actor?.id ?? null,
		htmlOptions: enrichOpts,
		descriptionChars: descLen,
		afterCommonReplaceChars: afterReplaceLen,
		enrichedHtmlChars,
		phasesMs: {
			duplicateSystem: Number(duplicateMs.toFixed(2)),
			readLabels: Number(labelsReadMs.toFixed(2)),
			getWeaponUse: Number(getWeaponUseMs.toFixed(2)),
			commonReplace: Number(commonReplaceMs.toFixed(2)),
			enrichHTML: Number(enrichHTMLMs.toFixed(2)),
			typeChatData: Number(typeChatDataMs.toFixed(2)),
			sumCorePhases: Number(
				(duplicateMs + labelsReadMs + getWeaponUseMs + commonReplaceMs + enrichHTMLMs + typeChatDataMs).toFixed(2)
			),
			fullGetChatData: Number(fullGetChatDataMs.toFixed(2)),
			remainderAfterCore: Number(
				(fullGetChatDataMs - duplicateMs - labelsReadMs - getWeaponUseMs - commonReplaceMs - enrichHTMLMs - typeChatDataMs).toFixed(2)
			)
		},
		hint: "Compare enrichHTML vs commonReplace vs fullGetChatData. If enrich ≈ full, cost is mostly TextEditor. If commonReplace is large — @ substitutions in Helper.commonReplace (recursion). _featureChatData is tiny; remainderAfterCore is props/activation tail of getChatData (usually small)."
	};

	sheetPerfLastPhaseProfile = out;
	console.log(`[${MODULE_ID}] sheetPerfProfileGetChatDataPhases`, out);
	console.table(out.phasesMs);
	return out;
}

function gmBackupReminder() {
	if (!game.user?.isGM) return;
	console.info(
		`%c[${MODULE_ID}] Data safety:%c Before editing worlds/scales-of-war/data/*.db or running DB tools, copy the entire folder worlds/scales-of-war (or full Data backup).`,
		"color:#6cf;font-weight:bold",
		"color:inherit;font-weight:normal"
	);
}

/** Register probe settings (call from main module init). */
export function registerSheetPerfProbeInit() {
	registerSettings();
}

/**
 * Probe globals, timing hooks, GM baseline (call from ready when game.system is dnd4e).
 */
export function registerSheetPerfProbeReady() {
	globalThis.sheetPerfLog = sheetPerfLog;
	globalThis.sheetPerfBaseline = sheetPerfBaseline;
	globalThis.sheetPerfMigration = sheetPerfMigration;
	globalThis.sheetPerfActorAudit = sheetPerfActorAudit;
	globalThis.sheetPerfBisectHelp = sheetPerfBisectHelp;
	globalThis.sheetPerfEnableDebugHooks = sheetPerfEnableDebugHooks;
	globalThis.sheetPerfHookTimings = sheetPerfHookTimings;
	globalThis.sheetPerfClearMeasures = sheetPerfClearMeasures;
	globalThis.sheetPerfBenchmarkActor = sheetPerfBenchmarkActor;
	globalThis.sheetPerfPrewarmActor = sheetPerfPrewarmActor;
	globalThis.sheetPerfBreakdownActor = sheetPerfBreakdownActor;
	globalThis.sheetPerfProfileGetChatDataPhases = sheetPerfProfileGetChatDataPhases;
	Object.defineProperty(globalThis, "sheetPerfLastBreakdown", {
		get: () => sheetPerfLastBreakdown,
		configurable: true
	});
	Object.defineProperty(globalThis, "sheetPerfLastPhaseProfile", {
		get: () => sheetPerfLastPhaseProfile,
		configurable: true
	});

	gmBackupReminder();
	registerSheetTimingHooks();

	if (game.user?.isGM) {
		sheetPerfBaseline();
		if (game.system?.id === "dnd4e") sheetPerfMigration();
	}

	console.log(
		`[${MODULE_ID}] Sheet perf probe ready. APIs: … sheetPerfBreakdownActor(actor|id) → sheetPerfLastBreakdown; sheetPerfProfileGetChatDataPhases(item|id) → sheetPerfLastPhaseProfile; sheetPerfBenchmarkActor, sheetPerfPrewarmActor, sheetPerfLog`
	);
}
