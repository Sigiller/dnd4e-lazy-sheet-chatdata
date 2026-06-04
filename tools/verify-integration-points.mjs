#!/usr/bin/env node
/**
 * Verify dnd4e 0.7.14 still exposes symbols patched by dnd4e-lazy-sheet-chatdata.
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

const actorSheet = read("module/actor/actor-sheet.js");
const itemJs = read("module/item/item.js");

ok("system.version", systemJson.version === "0.7.14", systemJson.version);
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
	"lib/render-collapsed-rows-deferred-flag.js",
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
	"libWrapper uses string targets via registerLibWrapperFirst (FVTT 13)",
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

const allPass = checks.every((c) => c.pass);
console.log(JSON.stringify({ systemVersion: systemJson.version, allPass, checks }, null, 2));
process.exit(allPass ? 0 : 1);
