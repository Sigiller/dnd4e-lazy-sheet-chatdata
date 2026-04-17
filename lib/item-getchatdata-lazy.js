/**
 * Патч-замена для dnd4e Item4e.getChatData: на листе (см. prep-context-marker) — быстрый путь без enrichHTML.
 * Апстрим: флаг htmlOptions.sheetPrep или метод getChatDataForActorSheet().
 */

import { MODULE_ID } from "../constants.js";
import { isActorInSheetPrepare } from "./prep-context-marker.js";
import { getChatDataSheetListFast } from "./get-chat-data-sheet-list-fast.js";
import { isItemExpandedOnSheet } from "./sheet-expanded-item-ids.js";

export function registerItemGetChatDataLazy() {
	const ItemCls = CONFIG.Item?.documentClass;
	if (!ItemCls?.prototype?.getChatData) return;

	try {
		libWrapper.register(
			MODULE_ID,
			ItemCls.prototype.getChatData,
			async function (wrapped, htmlOptions = {}, variance = {}) {
				if (!game.settings?.get(MODULE_ID, "enabled")) {
					return wrapped.call(this, htmlOptions, variance);
				}
				if (this.actor && isActorInSheetPrepare(this.actor)) {
					if (game.settings.get(MODULE_ID, "deferCollapsedRowChatData")) {
						const sheet = this.actor.sheet;
						if (
							sheet?.constructor?.name === "ActorSheet4e" &&
							!isItemExpandedOnSheet(sheet, this.id)
						) {
							return {
								description: { value: "", chat: "" },
								properties: [],
								_lazyStub: true
							};
						}
					}
					return getChatDataSheetListFast.call(this, htmlOptions, variance);
				}
				return wrapped.call(this, htmlOptions, variance);
			},
			libWrapper.WRAPPER,
			{ perf_mode: libWrapper.PERF_NORMAL }
		);
	} catch (e) {
		console.error(`[${MODULE_ID}] item-getchatdata-lazy`, e);
	}
}
