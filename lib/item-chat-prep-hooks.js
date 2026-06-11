/**
 * Item.roll / toChat: ensure PC sheet row has full chatData before chat card is built.
 */
import { MODULE_ID } from "../constants.js";
import { ensureItemRowReadyForChat } from "./item-chat-ready.js";
import { withForceFullChatData } from "./force-full-chatdata.js";

export function registerItemChatPrepHooks() {
	const ItemCls = CONFIG.Item?.documentClass;
	if (!ItemCls?.prototype) return;

	const wrap = (proto, method) => {
		const orig = proto[method];
		if (typeof orig !== "function" || orig.__dnd4eLazyChatPrepWrapped) return;
		proto[method] = async function (...args) {
			if (game.settings?.get(MODULE_ID, "enabled")) {
				await ensureItemRowReadyForChat(this);
				return withForceFullChatData(this, () => orig.apply(this, args));
			}
			return orig.apply(this, args);
		};
		Object.defineProperty(proto[method], "__dnd4eLazyChatPrepWrapped", { value: true });
	};

	wrap(ItemCls.prototype, "roll");
	wrap(ItemCls.prototype, "toChat");
}
