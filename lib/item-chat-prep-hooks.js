/**
 * Item.roll / toChat: keep the chat card off the lazy paths.
 *
 * A roll updates the actor, which starts a sheet re-render; the roll then keeps building its card
 * while that prep is in flight. Without the bypass the card's getChatData would return a stub and
 * its enrichHTML would return raw HTML. See lib/force-full-chatdata.js.
 */
import { MODULE_ID } from "../constants.js";
import { withForceFullChatData } from "./force-full-chatdata.js";
import { getItemMethodTargets, registerLibWrapperFirst } from "./libwrapper-register.js";

export function registerItemChatPrepHooks() {
	for (const method of ["roll", "toChat"]) {
		if (typeof CONFIG.Item?.documentClass?.prototype?.[method] !== "function") continue;

		registerLibWrapperFirst(
			`item-chat-prep-hooks:${method}`,
			getItemMethodTargets(method),
			async function (wrapped, ...args) {
				if (!game.settings?.get(MODULE_ID, "enabled")) return wrapped.apply(this, args);
				return withForceFullChatData(this, () => wrapped.apply(this, args));
			},
			{ perf_mode: libWrapper.PERF_NORMAL }
		);
	}
}
