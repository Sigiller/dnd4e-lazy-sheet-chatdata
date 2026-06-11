/**
 * Lazy sheet chatData optimizations apply only to PC actor sheets (not NPC/Hazard stat blocks).
 */

/** @param {Actor | null | undefined} actor */
export function isLazyOptimizationActor(actor) {
	return actor?.type === "Player Character";
}
