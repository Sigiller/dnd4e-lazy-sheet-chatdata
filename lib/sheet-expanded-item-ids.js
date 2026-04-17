/**
 * Зеркало развёрнутых строк предмета на листе (аналог #expandedItemIds, доступное модулю).
 * Синхронизируется из обёртки itemSummary после клика.
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
 * После dnd4e #onItemSummary: обновить зеркало по классу collapsed на строке.
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
