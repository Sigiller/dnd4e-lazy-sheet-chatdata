/**
 * Equivalent of Item4e.getChatData (dnd4e 0.9+ does not enrichHTML here).
 * Upstream: Item4e.getChatDataForSheetList() or option { sheetList: true }.
 *
 * @this {Item}
 */
export async function getChatDataSheetListFast(htmlOptions = {}, variance = {}) {
	const data = foundry.utils.duplicate(this.system);
	const labels = this.labels;

	htmlOptions.rollData = this.getRollData();

	const props = [];
	const fn = this[`_${this.type}ChatData`];
	if (fn) fn.bind(this)(data, labels, props);

	if (["light", "heavy"].includes(this.system.armour?.subtype) || (this.type === "weapon")) {
		if (this.isActorProficient) {
			props.push(`<li class="proficiency">${_loc("DND4E.Proficient")}</li>`);
		} else {
			props.push(`<li class="proficiency negative">${_loc("DND4E.NotProficient")}</li>`);
		}
	}

	if (("equipped" in data) && ["equipment", "weapon", "container"].includes(this.type)) {
		if (data?.equipped) {
			props.push(`<li class="equipped">${_loc("DND4E.Equipped")}</li>`);
		} else {
			props.push(`<li class="equipped negative">${_loc("DND4E.Unequipped")}</li>`);
		}
	}

	if ("activation" in data) {
		if (labels?.activation) props.push(`<li class="activation">${labels.activation} ${data.activation.condition}</li>`);
		if (labels?.attribute) props.push(`<li class="attribute">${labels.attribute}</li>`);
		if (labels?.target) props.push(`<li class="target">${labels.target}</li>`);
		if (data.isRanged && labels?.range) props.push(`<li class="range">${_loc("DND4E.Range")}: ${labels.range}</li>`);
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
