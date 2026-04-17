import { MODULE_ID } from "./constants.js";

/**
 * Все флаги — scope world, чтобы GM включал эксперименты для стола.
 * Каждый файл-патч проверяет `enabled` и свой ключ.
 */
export function registerModuleSettings() {
	game.settings.register(MODULE_ID, "enabled", {
		name: "Модуль включён",
		hint: "Мастер-переключатель всех оптимизаций.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "enrichOnExpand", {
		name: "Полный enrich при раскрытии строки предмета",
		hint: "После itemSummary — полный getChatData и обновление DOM (см. lib/item-summary-expand-enrich.js).",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "deferCollapsedRowChatData", {
		name: "Свёрнутые строки: без getChatData до раскрытия",
		hint: "На листе в prep — пустой stub вместо getChatData для свёрнутых строк; data-summary-deferred через хук render; догрузка по клику (модуль, без правок системы dnd4e).",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "lazyBiographyPrep", {
		name: "Биография: без enrich при сборке листа",
		hint: "Во время _prepareContext — только commonReplace (или сырой HTML). См. lib/prep-skip-enrich-html.js + lib/post-idle-biography-enrich.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "lazyPowerCardPrepEnrich", {
		name: "Карточка силы (autoGen): без enrich при сборке",
		hint: "Во время _prepareContext не вызывать enrichHTML для detailsText; сырой HTML карточки до раскрытия/перерисовки. См. lib/prep-skip-enrich-html.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "idleBiographyAfterRender", {
		name: "Биография: догрузить enrich после первого кадра (эксп.)",
		hint: "Если включено — requestIdleCallback + хук renderActorSheetV2; ProseMirror может потребовать доработки под dnd4e. См. lib/post-idle-biography-enrich.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(MODULE_ID, "enrichHtmlSessionCache", {
		name: "Кэш enrichHTML (сессия)",
		hint: "Короткий LRU по хэшу входной строки + актёр + secrets. См. lib/enrich-html-session-cache.js.",
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(MODULE_ID, "logSheetListFastAggregates", {
		name: "[Профиль] Лог суммы getChatDataSheetListFast за prep",
		hint: "После каждого _prepareContext листа — в консоль total/calls/avg ms по быстрому пути списка. Для плана cold open / фаза profile-fast-path.",
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
}
