/**
 * Full getChatData → DOM update for an expanded sheet row (shared by expand + chat prep).
 */

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
