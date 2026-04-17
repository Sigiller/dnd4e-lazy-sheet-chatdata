/**
 * Параллель biography + цикл предметов нельзя надёжно вставить только libWrapper’ом без копии тела _prepareContext.
 * Здесь — фрагмент для ручного переноса в systems/dnd4e/module/actor/actor-sheet.js.
 *
 * Идея: после mergeObject(context, …) и вычисления context.items запустить одновременно
 *   Promise.all([ цикл по items (chatData + detailsText), enrichHTML(biography) ])
 * и await обоих, затем присвоить context.biographyHTML из второго промиса.
 *
 * ## Чеклист апстрим-PR (dnd4e, опционально после стабилизации в модуле)
 * 1. **Контракт prep**: `Item#getChatData({ sheetList: true })` или отдельный `getChatDataForActorSheetList()`
 *    — чтобы модуль мог снять libWrapper с горячего пути.
 * 2. **Флаг на листе**: `ActorSheet4e` выставляет `htmlOptions` / внутренний флаг на время `_prepareContext`,
 *    чтобы ядро не вызывало полный enrich для power card в prep (см. текущие патчи prep-skip-enrich-html).
 * 3. **Параллель items + biography** — фрагмент ниже; убрать последовательный второй enrich биографии.
 * 4. **Ленивые вкладки** (большой PR): partials Handlebars или рендер только активной вкладки +
 *    хук смены вкладки — см. lib/structural-tabs-roadmap.js.
 * 5. Тесты: открытие листа персонажа с N>100 items, миграция мира, отсутствие регрессий в чате предметов.
 */

export const PARALLEL_PREP_UPSTREAM_SNIPPET = String.raw`
// --- dnd4e actor-sheet.js _prepareContext (идея патча) ---
// const itemsPromise = Promise.all(context.items.map(async (i) => { ... }));
// const bioPromise = context.isCreature
//   ? foundry.applications.ux.TextEditor.implementation.enrichHTML(context.system.biography, {
//       secrets: isOwner, async: true, relativeTo: this.actor
//     })
//   : Promise.resolve("");
// const [, biographyHTML] = await Promise.all([itemsPromise, bioPromise]);
// context.biographyHTML = biographyHTML;
// (убрать последующий одиночный await enrichHTML для биографии)
`;

let _parallelHintLogged = false;
export function logParallelUpstreamSnippetOnce() {
	if (_parallelHintLogged) return;
	_parallelHintLogged = true;
	console.info(
		"%c[dnd4e-lazy-sheet-chatdata]%c Параллель items+biography — см. lib/parallel-prep-upstream-snippet.js (экспорт PARALLEL_PREP_UPSTREAM_SNIPPET)",
		"font-weight:bold",
		""
	);
}
