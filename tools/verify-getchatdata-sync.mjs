#!/usr/bin/env node
/**
 * Static sync check: Item4e.getChatData tail vs getChatDataSheetListFast.
 * Run from repo root: node Data/modules/dnd4e-lazy-sheet-chatdata/tools/verify-getchatdata-sync.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(__dirname, "..");
const systemItem = path.resolve(moduleRoot, "../../systems/dnd4e/module/item/item.js");

const fastPath = path.join(moduleRoot, "lib/get-chat-data-sheet-list-fast.js");

function extractFunctionBody(src, signature) {
	const start = src.indexOf(signature);
	if (start < 0) throw new Error(`${signature} not found`);
	const parenEnd = src.indexOf(")", start);
	if (parenEnd < 0) throw new Error("closing paren not found");
	const open = src.indexOf("{", parenEnd);
	if (open < 0) throw new Error("function body not found");
	let depth = 0;
	for (let i = open; i < src.length; i++) {
		if (src[i] === "{") depth++;
		else if (src[i] === "}") {
			depth--;
			if (depth === 0) return src.slice(open + 1, i);
		}
	}
	throw new Error(`unbalanced braces in ${signature}`);
}

function extractGetChatDataBody(src) {
	return extractFunctionBody(src, "async getChatData(htmlOptions");
}

const ENRICH_ASSIGN =
	/data\.description\.value\s*=\s*await\s+foundry\.applications\.ux\.TextEditor\.implementation\.enrichHTML\(\s*descriptionText\s*,\s*htmlOptions\s*\)\s*;/;

function normalizeForCompare(body) {
	return body
		.replace(/\/\/[^\n]*/g, "")
		.replace(ENRICH_ASSIGN, "data.description.value = descriptionText;")
		.replace(/htmlOptions\.async\s*=\s*true;\s*/g, "")
		.replace(/const\s+Helper\s*=\s*game\.helper;?\s*/g, "")
		.replace(/['"]/g, '"')
		.replace(/if\s*\(\s*fn\s*\)/g, "if (fn)")
		.replace(/\(\s*p\s*\)\s*=>/g, "p=>")
		.replace(/\s+/g, " ")
		.trim();
}

function extractFastPathBody(src) {
	return extractFunctionBody(src, "export async function getChatDataSheetListFast");
}

const systemSrc = fs.readFileSync(systemItem, "utf8");
const fastSrc = fs.readFileSync(fastPath, "utf8");

const systemBody = normalizeForCompare(extractGetChatDataBody(systemSrc));
const fastBody = normalizeForCompare(extractFastPathBody(fastSrc));

const match = systemBody === fastBody;
const matchIgnoringWhitespace = systemBody.replace(/\s/g, "") === fastBody.replace(/\s/g, "");
console.log(
	JSON.stringify(
		{
			systemItem,
			fastPath,
			match,
			matchIgnoringWhitespace,
			systemLen: systemBody.length,
			fastLen: fastBody.length
		},
		null,
		2
	)
);
if (!match && !matchIgnoringWhitespace) {
	const minLen = Math.min(systemBody.length, fastBody.length);
	for (let i = 0; i < minLen; i++) {
		if (systemBody[i] !== fastBody[i]) {
			console.error("First diff at index", i);
			console.error("system:", systemBody.slice(Math.max(0, i - 40), i + 80));
			console.error("fast:  ", fastBody.slice(Math.max(0, i - 40), i + 80));
			break;
		}
	}
	process.exit(1);
}
process.exit(0);
