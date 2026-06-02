/**
 * libWrapper for dnd4e: wraps ActorSheet4e._prepareContext with a “sheet is preparing” marker
 * so other patches (getChatData, enrichHTML) can tell sheet prep from chat / elsewhere.
 *
 * Upstream: replace with e.g. this.#preparingContext on the sheet class.
 */

import { MODULE_ID } from "../constants.js";
import {
	actorsInSheetPrepare,
	preparingSheetByActor,
	isActorInSheetPrepare
} from "./sheet-prep-context.js";
import { applyOffTabStubPassIfNeeded } from "./off-tab-item-prep.js";

export { isActorInSheetPrepare };

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 */
export function registerPrepContextMarker(ActorSheet4e) {
	if (!ActorSheet4e?.prototype?._prepareContext) return;

	try {
		libWrapper.register(
			MODULE_ID,
			ActorSheet4e.prototype._prepareContext,
			async function (wrapped, options) {
				if (!game.settings?.get(MODULE_ID, "enabled")) {
					return wrapped.call(this, options);
				}
				const actor = this.actor;
				if (!actor) return wrapped.call(this, options);
				actorsInSheetPrepare.add(actor);
				preparingSheetByActor.set(actor, this);
				applyOffTabStubPassIfNeeded(this);
				try {
					const ctx = await wrapped.call(this, options);
					// Stub getChatData (deferCollapsedRowChatData): clear detailsText for autoGen power with empty chatData.
					if (game.settings.get(MODULE_ID, "deferCollapsedRowChatData")) {
						for (const i of ctx.items ?? []) {
							if (!i.chatData?._lazyStub) continue;
							delete i.chatData._lazyStub;
							const doc = this.actor?.items?.get(i._id);
							if (doc?.type === "power" && doc.system?.autoGenChatPowerCard) i.detailsText = "";
						}
					}
					return ctx;
				} finally {
					actorsInSheetPrepare.delete(actor);
					preparingSheetByActor.delete(actor);
				}
			},
			libWrapper.WRAPPER,
			{ perf_mode: libWrapper.PERF_NORMAL }
		);
	} catch (e) {
		console.error(`[${MODULE_ID}] prep-context-marker`, e);
	}
}
