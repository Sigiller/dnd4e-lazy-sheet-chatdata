/**
 * libWrapper for dnd4e Item4e.getChatData: on the sheet (see prep-context-marker) — stub / fast path during prep (never full enrich).
 * Upstream: htmlOptions.sheetPrep flag or getChatDataForActorSheet().
 */

import { MODULE_ID } from "../constants.js";
import {
	isActorInSheetPrepare,
	getPreparingSheet,
	isDnd4eActorSheet,
	makeLazyChatDataStub,
	hasCompendiumOrUuidReference,
	needsPowerCardChatDataDuringPrep
} from "./sheet-prep-context.js";
import { getChatDataSheetListFast } from "./get-chat-data-sheet-list-fast.js";
import { isItemExpandedOnSheet } from "./sheet-expanded-item-ids.js";
import { shouldStubOffTabItem } from "./off-tab-item-prep.js";
import { getItemGetChatDataTargets, registerLibWrapperFirst } from "./libwrapper-register.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { isForceFullChatData } from "./force-full-chatdata.js";

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 */
export function registerItemGetChatDataLazy(ActorSheet4e) {
	const ItemCls = CONFIG.Item?.documentClass;
	if (!ItemCls?.prototype?.getChatData) return;

	registerLibWrapperFirst(
		"item-getchatdata-lazy",
		getItemGetChatDataTargets(),
		async function (wrapped, htmlOptions = {}, variance = {}) {
			if (!game.settings?.get(MODULE_ID, "enabled")) {
				return wrapped.call(this, htmlOptions, variance);
			}
			const actor = this.actor;
			if (!actor || !isLazyOptimizationActor(actor)) {
				return wrapped.call(this, htmlOptions, variance);
			}
			if (isForceFullChatData(this)) {
				return wrapped.call(this, htmlOptions, variance);
			}
			if (!isActorInSheetPrepare(actor)) {
				return wrapped.call(this, htmlOptions, variance);
			}

			const sheet = getPreparingSheet(actor) ?? actor.sheet;
			if (!isDnd4eActorSheet(sheet)) {
				return getChatDataSheetListFast.call(this, htmlOptions, variance);
			}

			if (needsPowerCardChatDataDuringPrep(this)) {
				return getChatDataSheetListFast.call(this, htmlOptions, variance);
			}

			if (shouldStubOffTabItem(sheet, this)) {
				return makeLazyChatDataStub();
			}

			if (
				game.settings.get(MODULE_ID, "deferCollapsedRowChatData") &&
				!isItemExpandedOnSheet(sheet, this.id)
			) {
				return makeLazyChatDataStub();
			}

			if (
				game.settings.get(MODULE_ID, "deferCompendiumEnrichDuringPrep") &&
				hasCompendiumOrUuidReference(this.system?.description?.value)
			) {
				return makeLazyChatDataStub();
			}

			return getChatDataSheetListFast.call(this, htmlOptions, variance);
		},
		{ type: libWrapper.MIXED, perf_mode: libWrapper.PERF_NORMAL }
	);
}
