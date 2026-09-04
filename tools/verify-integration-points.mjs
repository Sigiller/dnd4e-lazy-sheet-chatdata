#!/usr/bin/env node
/**
 * Verify dnd4e 0.9.x still exposes symbols patched by dnd4e-lazy-sheet-chatdata.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(__dirname, "..");
const systemRoot = path.resolve(moduleRoot, "../../systems/dnd4e");

function read(rel) {
	return fs.readFileSync(path.join(systemRoot, rel), "utf8");
}

const systemJson = JSON.parse(fs.readFileSync(path.join(systemRoot, "system.json"), "utf8"));
const checks = [];

function ok(name, pass, detail = "") {
	checks.push({ name, pass, detail });
}

const actorSheet = read("module/applications/sheets/actor-sheet.mjs");
const itemJs = read("module/documents/item.mjs");

ok("system.version 0.9+", /^0\.9\./.test(systemJson.version), systemJson.version);
ok(
	"system Foundry 14",
	String(systemJson.compatibility?.minimum).startsWith("14"),
	JSON.stringify(systemJson.compatibility)
);
ok("ActorSheet4e._prepareContext", /async _prepareContext\s*\(/.test(actorSheet));
ok(
	"ActorSheet4e App V2 (changeTab on prototype chain)",
	/class ActorSheet4e/.test(actorSheet) && /ActorSheetV2/.test(actorSheet)
);
ok("item loop getChatData", /i\.chatData\s*=\s*await item\.getChatData/.test(actorSheet));
ok("TABS.sheet.initial powers", /initial:\s*["']powers["']/.test(actorSheet));
ok("itemSummary action", /itemSummary:\s*ActorSheet4e\.#onItemSummary/.test(actorSheet));
ok("#onItemSummary", /#onItemSummary/.test(actorSheet));
ok("biography enrichHTML", /enrichHTML\(context\.system\.biography/.test(actorSheet));
ok("Item4e.getChatData", /async getChatData\s*\(htmlOptions/.test(itemJs));
ok("no core deferOffTab patch", !/deferOffTabItemChatPrep/.test(actorSheet));
ok("dnd4e.utils namespace (no game.helper)", /export function preparePowerCardData/.test(read("module/utils/utils.mjs")));

const templates = ["powers", "inventory", "features", "rituals"].map((t) =>
	read(`templates/actors/tabs/${t}.hbs`)
);
ok(
	"templates item-summary + chatData",
	templates.every((t) => t.includes("item-summary") && t.includes("chatData"))
);

const moduleFiles = [
	"lib/libwrapper-register.js",
	"lib/item-getchatdata-lazy.js",
	"lib/prep-context-marker.js",
	"lib/prep-skip-enrich-html.js",
	"lib/actor-sheet-change-tab-hooks.js",
	"lib/item-summary-expand-enrich.js",
	"lib/render-lazy-rows.js",
	"main.js"
].map((f) => path.join(moduleRoot, f));
ok("module entry files exist", moduleFiles.every((f) => fs.existsSync(f)));

const sheetPrepCtx = fs.readFileSync(path.join(moduleRoot, "lib/sheet-prep-context.js"), "utf8");
ok("sheet-prep-context exports", /export function getPreparingSheet/.test(sheetPrepCtx));
ok("off-tab-item-prep", fs.existsSync(path.join(moduleRoot, "lib/off-tab-item-prep.js")));

const libFiles = [
	"lib/prep-skip-enrich-html.js",
	"lib/prep-context-marker.js",
	"lib/item-getchatdata-lazy.js",
	"lib/actor-sheet-change-tab-hooks.js"
].map((f) => fs.readFileSync(path.join(moduleRoot, f), "utf8"));
ok(
	"libWrapper uses string targets via registerLibWrapperFirst",
	libFiles.every((src) => /registerLibWrapperFirst/.test(src)) &&
		libFiles.every((src) => !/libWrapper\.register\s*\(\s*MODULE_ID\s*,\s*[A-Za-z_]/.test(src))
);
ok(
	"CONFIG.Item.documentClass getChatData target",
	/getItemGetChatDataTargets/.test(fs.readFileSync(path.join(moduleRoot, "lib/item-getchatdata-lazy.js"), "utf8"))
);
ok(
	"prep-context-marker registers on ready + fox sheet lineage + direct fallback",
	/registerPrepContextMarker\(ActorSheet4eClass\)/.test(fs.readFileSync(path.join(moduleRoot, "main.js"), "utf8")) &&
		/isDnd4eActorSheetClass/.test(fs.readFileSync(path.join(moduleRoot, "lib/libwrapper-register.js"), "utf8")) &&
		/registerPrepContextMarkerDirect/.test(fs.readFileSync(path.join(moduleRoot, "lib/prep-context-marker.js"), "utf8"))
);
ok(
	"enrichHTML + getChatData use libWrapper.MIXED (may skip wrapped)",
	/libWrapper\.MIXED/.test(fs.readFileSync(path.join(moduleRoot, "lib/prep-skip-enrich-html.js"), "utf8")) &&
		/libWrapper\.MIXED/.test(fs.readFileSync(path.join(moduleRoot, "lib/item-getchatdata-lazy.js"), "utf8"))
);
ok(
	"ActorSheet4e import is 0.9 path",
	/applications\/sheets\/actor-sheet\.mjs/.test(fs.readFileSync(path.join(moduleRoot, "constants.js"), "utf8")) &&
		/ACTOR_SHEET4E_IMPORT/.test(fs.readFileSync(path.join(moduleRoot, "main.js"), "utf8"))
);
ok(
	"closeApplicationV2 for ApplicationV2 sheets",
	/closeApplicationV2/.test(fs.readFileSync(path.join(moduleRoot, "lib/actor-sheet-change-tab-hooks.js"), "utf8"))
);

const libWrapperRegister = fs.readFileSync(path.join(moduleRoot, "lib/libwrapper-register.js"), "utf8");
ok(
	"libWrapper descriptors resolved without eval",
	!/new Function/.test(libWrapperRegister) && /foundry\.utils\.getProperty/.test(libWrapperRegister)
);

ok(
	"no local copy of Item4e.getChatData (wrapper calls `wrapped`)",
	!fs.existsSync(path.join(moduleRoot, "lib/get-chat-data-sheet-list-fast.js")) &&
		/wrapped\.call\(this, htmlOptions, variance\)/.test(
			fs.readFileSync(path.join(moduleRoot, "lib/item-getchatdata-lazy.js"), "utf8")
		)
);

const renderLazyRows = fs.readFileSync(path.join(moduleRoot, "lib/render-lazy-rows.js"), "utf8");
ok(
	"expanded rows refreshed after render (re-render recovery)",
	/li\.item:not\(\.collapsed\)\[data-item-id\]/.test(renderLazyRows) &&
		/applyEnrichedItemSummary/.test(renderLazyRows)
);

ok(
	"expand/refresh enriches description like the upstream item loop",
	/enrichHTML/.test(fs.readFileSync(path.join(moduleRoot, "lib/item-enriched-summary.js"), "utf8"))
);

ok(
	"biography enrich flag cleared per render",
	/delete app\._lazyBiographyTabEnrichDone/.test(
		fs.readFileSync(path.join(moduleRoot, "lib/actor-sheet-change-tab-hooks.js"), "utf8")
	)
);

// `html?.[0] ?? html` silently resolves the sheet root to a <button>: the root is a <form>, and
// HTMLFormElement indexed access is its form-controls collection. Cost us the whole
// data-summary-deferred mechanism on Foundry v14. Must go through lib/sheet-root-element.js.
const libSources = fs
	.readdirSync(path.join(moduleRoot, "lib"))
	.filter((f) => f.endsWith(".js"))
	.map((f) => ({ file: f, src: fs.readFileSync(path.join(moduleRoot, "lib", f), "utf8") }));
const jqueryRootIdiom = libSources.filter(
	({ file, src }) => file !== "sheet-root-element.js" && /\?\.\[0\]\s*\?\?/.test(src)
);
ok(
	"no jQuery-era `?.[0] ??` root unwrapping outside sheet-root-element.js",
	jqueryRootIdiom.length === 0,
	jqueryRootIdiom.map((x) => x.file).join(", ")
);
ok(
	"sheet root resolved via resolveSheetRoot",
	/resolveSheetRoot/.test(fs.readFileSync(path.join(moduleRoot, "lib/render-lazy-rows.js"), "utf8")) &&
		/resolveSheetRoot/.test(
			fs.readFileSync(path.join(moduleRoot, "lib/actor-sheet-change-tab-hooks.js"), "utf8")
		)
);

const lazyPrepSettings = fs.readFileSync(path.join(moduleRoot, "lib/lazy-prep-settings.js"), "utf8");
const settingsJs = fs.readFileSync(path.join(moduleRoot, "settings.js"), "utf8");
const hotPathKeys = [...lazyPrepSettings.matchAll(/^\t"([a-zA-Z]+)",?$/gm)].map((m) => m[1]);
ok(
	"every hot-path settings key is registered",
	hotPathKeys.length > 0 && hotPathKeys.every((k) => settingsJs.includes(`"${k}"`)),
	hotPathKeys.join(", ")
);

const allPass = checks.every((c) => c.pass);
console.log(JSON.stringify({ systemVersion: systemJson.version, allPass, checks }, null, 2));
process.exit(allPass ? 0 : 1);
