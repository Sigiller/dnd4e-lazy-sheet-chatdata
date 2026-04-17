/**
 * Mirror of expanded item rows on the sheet (like #expandedItemIds, usable by the module).
 * Synced from the itemSummary wrapper after click.
 *
 * @type {WeakMap<foundry.applications.api.Application, Set<string>>}
 */
const expandedItemIdsMirror = new WeakMap();

/**
 * @param {foundry.applications.api.Application} sheet
 * @returns {Set<string>}
 */
export function getExpandedItemIdsMirror(sheet) {
	if (!sheet) return new Set();
	let s = expandedItemIdsMirror.get(sheet);
	if (!s) {
		s = new Set();
		expandedItemIdsMirror.set(sheet, s);
	}
	return s;
}

/** @param {foundry.applications.api.Application} sheet @param {string} itemId */
export function isItemExpandedOnSheet(sheet, itemId) {
	return getExpandedItemIdsMirror(sheet).has(itemId);
}

/**
 * After dnd4e #onItemSummary: update mirror from the row’s collapsed class.
 * @param {foundry.applications.api.Application} sheet
 * @param {HTMLElement | null} li
 */
export function syncExpandedMirrorFromItemRow(sheet, li) {
	const id = li?.dataset?.itemId;
	if (!id || !sheet) return;
	const set = getExpandedItemIdsMirror(sheet);
	if (li.classList.contains("collapsed")) set.delete(id);
	else set.add(id);
}
