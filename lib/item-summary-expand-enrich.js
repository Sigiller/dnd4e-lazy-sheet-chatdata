/**
 * После раскрытия строки предмета — полный getChatData + обновление DOM (как в dnd4e 0.6 по клику).
 * Апстрим: встроить в ActorSheet4e.#onItemSummary или отдельный хук.
 */

import { MODULE_ID } from "../constants.js";
import { syncExpandedMirrorFromItemRow } from "./sheet-expanded-item-ids.js";

/**
 * @param {foundry.applications.sheets.ActorSheetV2} sheet
 * @param {HTMLElement} li
 * @param {Item} item
 * @param {object} chatData
 */
async function applyEnrichedItemSummary(sheet, li, item, chatData) {
	const summary = li.querySelector(".item-summary");
	if (!summary) return;

	const ul =
		summary.querySelector("ul.item-properties.tags") || summary.querySelector("ul.item-properties");
	if (ul) ul.innerHTML = (chatData.properties || []).join("");

	const Helper = game.helper;
	const actor = sheet.actor;

	if (item.type === "power" && item.system?.autoGenChatPowerCard) {
		const flavour = summary.querySelector(".flavour");
		if (flavour) {
			if (chatData.description?.chat) {
				flavour.innerHTML = `<p>${chatData.description.chat}</p>`;
			} else {
				flavour.innerHTML = chatData.description?.value ?? "";
			}
		}
		let attackBonus = null;
		if (item.hasAttack) attackBonus = await item.getAttackBonus();
		let detailsText = Helper._preparePowerCardData(chatData, CONFIG, actor, attackBonus);
		detailsText = await foundry.applications.ux.TextEditor.implementation.enrichHTML(detailsText, {
			async: true,
			relativeTo: actor
		});
		const det = summary.querySelector(".item-details");
		if (det) det.innerHTML = detailsText;
		return;
	}

	const descEl = summary.querySelector(".item-description");
	if (descEl) {
		descEl.innerHTML = chatData.description?.value ?? "";
		return;
	}

	const card = summary.querySelector(".card-content");
	if (!card) return;
	const ulInCard = card.querySelector(":scope > ul.item-properties");
	if (ulInCard) {
		while (card.firstChild && card.firstChild !== ulInCard) card.removeChild(card.firstChild);
		const t = document.createElement("template");
		t.innerHTML = chatData.description?.value ?? "";
		while (t.content.firstChild) card.insertBefore(t.content.firstChild, ulInCard);
	} else {
		card.innerHTML = chatData.description?.value ?? "";
	}
}

/**
 * @param {typeof import("/systems/dnd4e/module/actor/actor-sheet.js").default} ActorSheet4e
 */
export function registerItemSummaryExpandEnrich(ActorSheet4e) {
	const orig = ActorSheet4e.DEFAULT_OPTIONS?.actions?.itemSummary;
	if (typeof orig !== "function" || orig.__dnd4eLazyExpandWrapped) return;

	const wrappedFn = async function (event, target) {
		await orig.call(this, event, target);
		const li = target?.closest?.(".item");
		if (li?.dataset?.itemId) syncExpandedMirrorFromItemRow(this, li);

		// Строка была со stub chatData (свёрнута при рендере) — догружаем полный getChatData + DOM.
		if (
			game.settings?.get(MODULE_ID, "enabled") &&
			game.settings.get(MODULE_ID, "deferCollapsedRowChatData") &&
			li &&
			!li.classList.contains("collapsed") &&
			li.dataset.summaryDeferred === "1"
		) {
			try {
				const item = this.actor?.items?.get(li.dataset.itemId);
				if (!item) return;
				const chatData = await item.getChatData({ secrets: this.actor.isOwner });
				await applyEnrichedItemSummary(this, li, item, chatData);
				li.removeAttribute("data-summary-deferred");
			} catch (e) {
				console.warn(`[${MODULE_ID}] item-summary-expand-enrich (deferred stub)`, e);
			}
			return;
		}

		if (!game.settings?.get(MODULE_ID, "enabled")) return;
		if (!game.settings?.get(MODULE_ID, "enrichOnExpand")) return;
		if (!li?.dataset?.itemId) return;
		if (li.classList.contains("collapsed")) return;
		const item = this.actor?.items?.get(li.dataset.itemId);
		if (!item) return;
		try {
			const chatData = await item.getChatData({ secrets: this.actor.isOwner });
			await applyEnrichedItemSummary(this, li, item, chatData);
		} catch (e) {
			console.warn(`[${MODULE_ID}] item-summary-expand-enrich`, e);
		}
	};
	wrappedFn.__dnd4eLazyExpandWrapped = true;
	ActorSheet4e.DEFAULT_OPTIONS.actions.itemSummary = wrappedFn;
}
