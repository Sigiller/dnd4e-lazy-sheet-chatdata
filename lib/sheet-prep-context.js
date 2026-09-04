/**
 * Shared state and helpers for ActorSheet4e._prepareContext / Item.getChatData during sheet prep.
 */

/** @type {WeakSet<Actor>} */
export const actorsInSheetPrepare = new WeakSet();

/** @type {WeakMap<Actor, import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default>} */
export const preparingSheetByActor = new WeakMap();

/** @type {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default | null} */
let ActorSheet4eClass = null;

/**
 * @param {typeof import("/systems/dnd4e/module/applications/sheets/actor-sheet.mjs").default} ActorSheet4e
 */
export function registerActorSheet4eClass(ActorSheet4e) {
	ActorSheet4eClass = ActorSheet4e;
}

/** @param {Actor} actor */
export function isActorInSheetPrepare(actor) {
	return Boolean(actor && actorsInSheetPrepare.has(actor));
}

/** @param {Actor} actor */
export function getPreparingSheet(actor) {
	return actor ? preparingSheetByActor.get(actor) ?? null : null;
}

/** @param {foundry.applications.api.Application | null | undefined} sheet */
export function isDnd4eActorSheet(sheet) {
	return Boolean(ActorSheet4eClass && sheet instanceof ActorSheet4eClass);
}

/**
 * Shape the sheet templates expect from `item.chatData` when the real thing is deferred.
 * Rows rendered from a stub are refreshed after paint (see render-lazy-rows.js) or on expand.
 */
export function makeLazyChatDataStub() {
	return {
		description: { value: "", chat: "" },
		properties: []
	};
}

/**
 * ActorSheet4e._prepareContext calls dnd4e.utils.preparePowerCardData for these items;
 * a lazy stub will crash (e.g. missing actionType).
 * @param {Item} item
 */
export function needsPowerCardChatDataDuringPrep(item) {
	return (
		(item.type === "power" || item.type === "consumable") && Boolean(item.system?.autoGenChatPowerCard)
	);
}
