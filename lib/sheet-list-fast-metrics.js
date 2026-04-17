/**
 * Лёгкие агрегаты для getChatDataSheetListFast во время одного _prepareContext.
 * Сброс в prep-context-marker; при включённой настройке — лог после prep.
 */

let _totalMs = 0;
let _count = 0;

export function resetSheetListFastMetrics() {
	_totalMs = 0;
	_count = 0;
}

/** @param {number} ms */
export function recordSheetListFastMs(ms) {
	_totalMs += ms;
	_count++;
}

export function readSheetListFastMetrics() {
	return {
		totalMs: Number(_totalMs.toFixed(2)),
		callCount: _count,
		avgMs: _count > 0 ? Number((_totalMs / _count).toFixed(2)) : 0
	};
}
