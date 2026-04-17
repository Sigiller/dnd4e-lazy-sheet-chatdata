/**
 * Патч-замена для dnd4e: оборачивает ActorSheet4e._prepareContext маркером «идёт сборка листа»,
 * чтобы другие патчи (getChatData, enrichHTML) могли отличить вызовы из листа от чата/других мест.
 *
 * Апстрим: можно заменить на флаг this.#preparingContext на классе листа.
 */

import { MODULE_ID } from "../constants.js";
import {
	readSheetListFastMetrics,
	resetSheetListFastMetrics
} from "./sheet-list-fast-metrics.js";

/** @type {WeakSet<Actor>} */
const actorsInSheetPrepare = new WeakSet();

/** @param {Actor} actor */
export function isActorInSheetPrepare(actor) {
	return Boolean(actor && actorsInSheetPrepare.has(actor));
}

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
				if (game.settings.get(MODULE_ID, "logSheetListFastAggregates")) {
					resetSheetListFastMetrics();
				}
				actorsInSheetPrepare.add(actor);
				try {
					const ctx = await wrapped.call(this, options);
					// Stub getChatData (deferCollapsedRowChatData): очистить detailsText у autoGen power с пустым chatData.
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
					if (game.settings.get(MODULE_ID, "logSheetListFastAggregates")) {
						const m = readSheetListFastMetrics();
						if (m.callCount > 0) {
							console.info(
								`[${MODULE_ID}] getChatDataSheetListFast за prep (${actor.name}): calls=${m.callCount} total=${m.totalMs}ms avg=${m.avgMs}ms`
							);
						}
					}
					actorsInSheetPrepare.delete(actor);
				}
			},
			libWrapper.WRAPPER,
			{ perf_mode: libWrapper.PERF_NORMAL }
		);
	} catch (e) {
		console.error(`[${MODULE_ID}] prep-context-marker`, e);
	}
}
