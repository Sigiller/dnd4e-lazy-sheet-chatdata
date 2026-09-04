/**
 * Locate the biography prose-mirror host on the actor sheet (dnd4e 0.9 / Foundry v14).
 */

import { resolveElement } from "./sheet-root-element.js";

/** @param {unknown} root */
export function findBiographyHost(root) {
	const el = resolveElement(root);
	if (!el) return null;
	return (
		el.querySelector('.tab[data-tab="biography"] prose-mirror[name="system.biography"]') ||
		el.querySelector('prose-mirror[name="system.biography"]') ||
		el.querySelector(".tab.biography prose-mirror")
	);
}
