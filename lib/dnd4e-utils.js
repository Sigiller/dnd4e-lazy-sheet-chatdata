/**
 * dnd4e 0.9+ helpers live on globalThis.dnd4e.utils (game.helper was removed).
 * @returns {typeof import("/systems/dnd4e/module/utils/utils.mjs") | null}
 */
export function getDnd4eUtils() {
	return globalThis.dnd4e?.utils ?? null;
}
