/**
 * Догрузка enrich для биографии после первого рендера листа (если prep-skip срезал enrich).
 * Осторожно: ProseMirror / shadow DOM — проверить под вашу сборку dnd4e + v13.
 *
 * Апстрим: хук первого показа вкладки «Биография» или API prose-mirror.
 */

import { MODULE_ID } from "../constants.js";
import { deferredBiographyActorIds } from "./prep-skip-enrich-html.js";

function findBiographyHost(root) {
	if (!root) return null;
	const el = root instanceof HTMLElement ? root : root?.[0];
	if (!el) return null;
	return (
		el.querySelector?.('.tab[data-tab="biography"] prose-mirror[name="system.biography"]') ||
		el.querySelector?.('prose-mirror[name="system.biography"]') ||
		el.querySelector?.(".tab.biography prose-mirror")
	);
}

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} _ActorSheet4e
 */
export function registerPostIdleBiographyEnrich(_ActorSheet4e) {
	Hooks.on("renderActorSheetV2", (app, html) => {
		if (!game.settings?.get(MODULE_ID, "enabled")) return;
		if (!game.settings.get(MODULE_ID, "idleBiographyAfterRender")) return;
		if (!game.settings.get(MODULE_ID, "lazyBiographyPrep")) return;

		const actor = app.document;
		if (!actor || !deferredBiographyActorIds.has(actor.id)) return;

		const root = html?.[0] ?? html ?? app.element?.[0] ?? app.element;
		if (!root) return;

		requestIdleCallback(
			async () => {
				if (!deferredBiographyActorIds.has(actor.id)) return;
				deferredBiographyActorIds.delete(actor.id);

				try {
					const bio = actor.system?.biography;
					const rich = await foundry.applications.ux.TextEditor.implementation.enrichHTML(bio, {
						secrets: actor.isOwner,
						async: true,
						relativeTo: actor
					});
					const richStr = typeof rich === "string" ? rich : String(rich ?? "");

					const host = findBiographyHost(app.element?.[0] ?? app.element ?? root);
					if (!host) return;

					const slot =
						host.shadowRoot?.querySelector?.('[part="editor-content"], .editor-content, .prosemirror-editor') ||
						host.querySelector?.(".editor-content");
					if (slot) {
						slot.innerHTML = richStr;
					} else {
						let inner = host.querySelector(".bio-rich-placeholder");
						if (!inner) {
							inner = document.createElement("div");
							inner.className = "bio-rich-placeholder";
							host.append(inner);
						}
						inner.innerHTML = richStr;
					}
				} catch (e) {
					console.warn(`[${MODULE_ID}] post-idle-biography-enrich`, e);
				}
			},
			{ timeout: 5000 }
		);
	});
}
