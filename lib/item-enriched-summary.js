/**
 * Full getChatData → DOM update for an expanded sheet row (shared by expand + post-render refresh).
 *
 * dnd4e 0.9+ does not enrich inside getChatData — ActorSheet4e._prepareContext does it in the item
 * loop — so this has to enrich with the same options upstream uses, or the row shows literal
 * `@UUID[…]` / `[[/r …]]` text.
 */

import { getDnd4eUtils } from "./dnd4e-utils.js";

/** @param {string} text @param {object} options */
async function enrich(text, options) {
	if (!text) return "";
	return foundry.applications.ux.TextEditor.implementation.enrichHTML(text, options);
}

/**
 * @param {foundry.applications.sheets.ActorSheetV2} sheet
 * @param {HTMLElement} li
 * @param {Item} item
 * @param {object} chatData
 */
export async function applyEnrichedItemSummary(sheet, li, item, chatData) {
	const summary = li.querySelector(".item-summary");
	if (!summary) return;

	const ul =
		summary.querySelector("ul.item-properties.tags") || summary.querySelector("ul.item-properties");
	if (ul) ul.innerHTML = (chatData.properties || []).join("");

	const actor = sheet.actor;
	// Same options as the upstream item loop in _prepareContext.
	const enrichOptions = { relativeTo: actor, rollData: item.getRollData() };

	if (item.type === "power" && item.system?.autoGenChatPowerCard) {
		const flavour = summary.querySelector(".flavour");
		if (flavour) {
			const source = chatData.description?.chat
				? `<p>${chatData.description.chat}</p>`
				: chatData.description?.value ?? "";
			flavour.innerHTML = await enrich(source, enrichOptions);
		}

		let attackBonus = null;
		if (item.hasAttack) attackBonus = await item.getAttackBonus();
		const utils = getDnd4eUtils();
		const detailsText = utils?.preparePowerCardData
			? utils.preparePowerCardData(chatData, actor?.getRollData?.() ?? null, attackBonus)
			: "";

		const det = summary.querySelector(".item-details");
		if (det) det.innerHTML = await enrich(detailsText, enrichOptions);
		return;
	}

	const descriptionHTML = await enrich(chatData.description?.value ?? "", enrichOptions);

	const descEl = summary.querySelector(".item-description");
	if (descEl) {
		descEl.innerHTML = descriptionHTML;
		return;
	}

	const card = summary.querySelector(".card-content");
	if (!card) return;
	const ulInCard = card.querySelector(":scope > ul.item-properties");
	if (ulInCard) {
		while (card.firstChild && card.firstChild !== ulInCard) card.removeChild(card.firstChild);
		const t = document.createElement("template");
		t.innerHTML = descriptionHTML;
		while (t.content.firstChild) card.insertBefore(t.content.firstChild, ulInCard);
	} else {
		card.innerHTML = descriptionHTML;
	}
}
