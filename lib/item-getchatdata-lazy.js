/**
 * libWrapper for dnd4e Item4e.getChatData: return a cheap stub instead of the real thing for
 * rows the user cannot see yet (collapsed rows, off-tab items on a cold open).
 *
 * Everything else calls straight through to `wrapped` — dnd4e 0.9+ no longer enriches inside
 * getChatData, so there is nothing left to skip on the non-stub path.
 *
 * Upstream: htmlOptions.sheetPrep flag or getChatDataForActorSheet().
 */

import {
	isActorInSheetPrepare,
	getPreparingSheet,
	isDnd4eActorSheet,
	makeLazyChatDataStub,
	needsPowerCardChatDataDuringPrep
} from "./sheet-prep-context.js";
import { isItemExpandedOnSheet } from "./sheet-expanded-item-ids.js";
import { shouldStubOffTabItem } from "./off-tab-item-prep.js";
import { getItemGetChatDataTargets, registerLibWrapperFirst } from "./libwrapper-register.js";
import { isLazyOptimizationActor } from "./lazy-actor-scope.js";
import { isForceFullChatData } from "./force-full-chatdata.js";
import { lazySettings } from "./lazy-prep-settings.js";

/**
 * @param {Item} item
 * @returns {boolean} true when this item's chatData can be deferred to after paint / expand.
 */
function shouldStubChatDataDuringPrep(item) {
	const settings = lazySettings();
	if (!settings.enabled) return false;

	const actor = item.actor;
	if (!actor || !isLazyOptimizationActor(actor)) return false;
	if (isForceFullChatData(item)) return false;
	if (!isActorInSheetPrepare(actor)) return false;

	const sheet = getPreparingSheet(actor) ?? actor.sheet;
	if (!isDnd4eActorSheet(sheet)) return false;

	// preparePowerCardData in _prepareContext reads real fields off chatData; a stub crashes it.
	if (needsPowerCardChatDataDuringPrep(item)) return false;

	if (shouldStubOffTabItem(sheet, item)) return true;
	return settings.deferCollapsedRowChatData && !isItemExpandedOnSheet(sheet, item.id);
}

export function registerItemGetChatDataLazy() {
	if (!CONFIG.Item?.documentClass?.prototype?.getChatData) return;

	registerLibWrapperFirst(
		"item-getchatdata-lazy",
		getItemGetChatDataTargets(),
		async function (wrapped, htmlOptions = {}, variance = {}) {
			if (shouldStubChatDataDuringPrep(this)) return makeLazyChatDataStub();
			return wrapped.call(this, htmlOptions, variance);
		},
		// MIXED: the stub path returns without calling wrapped (WRAPPER would unregister us).
		{ type: libWrapper.MIXED, perf_mode: libWrapper.PERF_NORMAL }
	);
}
