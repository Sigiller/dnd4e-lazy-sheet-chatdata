/**
 * Shared state and helpers for ActorSheet4e._prepareContext / Item.getChatData during sheet prep.
 */

/** @type {WeakSet<Actor>} */
export const actorsInSheetPrepare = new WeakSet();

/** @type {WeakMap<Actor, import("/systems/dnd4e/module/actor/actor-sheet.js").default>} */
export const preparingSheetByActor = new WeakMap();

/** @type {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default | null} */
let ActorSheet4eClass = null;

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
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

export const LAZY_CHAT_DATA_STUB = Object.freeze({
	description: { value: "", chat: "" },
	properties: [],
	_lazyStub: true
});

const COMPENDIUM_OR_UUID_REF = /@(Compendium|UUID|Item|Actor)\[/i;

/** @param {unknown} text */
export function hasCompendiumOrUuidReference(text) {
	return typeof text === "string" && COMPENDIUM_OR_UUID_REF.test(text);
}

/** @returns {typeof LAZY_CHAT_DATA_STUB} */
export function makeLazyChatDataStub() {
	return {
		description: { value: "", chat: "" },
		properties: [],
		_lazyStub: true
	};
}

/**
 * ActorSheet4e._prepareContext calls Helper._preparePowerCardData for these items;
 * a lazy stub will crash (e.g. missing actionType).
 * @param {Item} item
 */
export function needsPowerCardChatDataDuringPrep(item) {
	return (
		(item.type === "power" || item.type === "consumable") && Boolean(item.system?.autoGenChatPowerCard)
	);
}
