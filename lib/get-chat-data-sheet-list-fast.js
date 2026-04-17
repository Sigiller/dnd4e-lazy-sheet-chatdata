/**
 * Equivalent of the tail of Item4e.getChatData without enrichHTML on the description.
 * Upstream: Item4e.getChatDataForSheetList() or option { sheetList: true }.
 *
 * @this {Item}
 */
export async function getChatDataSheetListFast(htmlOptions = {}, variance = {}) {
	const Helper = game.helper;
	const data = foundry.utils.duplicate(this.system);
	const labels = this.labels;

	const description = data.description.value || "";
	const weaponUse = Helper.getWeaponUse(data, this.actor);
	const descriptionText = description
		? Helper.commonReplace(description, this.actor, this.system, weaponUse?.system)
		: description;

	data.description.value = descriptionText;

	const props = [];
	const fn = this[`_${this.type}ChatData`];
	if (fn) fn.bind(this)(data, labels, props);

	if (data.hasOwnProperty("proficient") && ["equipment", "weapon"].includes(this.type)) {
		if (
			this.type == "weapon" ||
			(data?.armour.type == "armour" && ![""].includes(data?.armour.subType)) ||
			(data?.armour.type == "arms" && ["light", "heavy"].includes(data?.armour.subType))
		) {
			if (data?.proficient || (data?.weaponType == "implement" && data?.proficientI)) {
				props.push(`<li class="proficiency">${game.i18n.localize("DND4E.Proficient")}</li>`);
			}
			if (data?.weaponType != "implement" && data?.proficientI) {
				props.push(`<li class="proficiency">${game.i18n.localize("DND4E.ProficiencyI")}</li>`);
			}
			if (!data?.proficient && !(data?.weaponType == "implement" && data?.proficientI)) {
				props.push(`<li class="proficiency negative">${game.i18n.localize("DND4E.NotProficient")}</li>`);
			}
		}
	}

	if (data.hasOwnProperty("equipped") && ["equipment", "weapon", "container"].includes(this.type)) {
		if (data?.equipped) {
			props.push(`<li class="equipped">${game.i18n.localize("DND4E.Equipped")}</li>`);
		} else {
			props.push(`<li class="equipped negative">${game.i18n.localize("DND4E.Unequipped")}</li>`);
		}
	}

	if (data.hasOwnProperty("activation")) {
		if (labels?.activation) props.push(`<li class="activation">${labels.activation} ${data.activation.condition}</li>`);
		if (labels?.attribute) props.push(`<li class="attribute">${labels.attribute}</li>`);
		if (labels?.target) props.push(`<li class="target">${labels.target}</li>`);
		if (data.isRanged && labels?.range)
			props.push(`<li class="range">${game.i18n.localize("DND4E.Range")}: ${labels.range}</li>`);
		if (labels?.castTime) props.push(`<li class="cast-time">${labels.castTime}</li>`);
		if (labels?.duration) props.push(`<li class="duration">${labels.duration}</li>`);
		if (labels?.component) props.push(`<li class="components">${labels.component}</li>`);
		if (labels?.componentCost) props.push(`<li class="component-cost">${labels.componentCost}</li>`);
		if (labels?.damageTypes) props.push(`<li class="keywords damage">${labels.damageTypes}</li>`);
		if (labels?.effectType) props.push(`<li class="keyword effect">${labels.effectType}</li>`);
	}

	data.properties = props.filter((p) => !!p);
	data.isCharge = variance?.isCharge || false;
	data.isOpp = variance?.isOpp || false;
	return data;
}
