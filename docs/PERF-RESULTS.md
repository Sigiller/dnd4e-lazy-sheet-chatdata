# Журнал сравнительных прогонов (cold open)

Добавляйте **одну строку на один завершённый шаг** после сравнения двух JSON (до / после). Имена файлов — `tools/foundry-sheet-e2e/sheet-perf-collect-*.json`.

Шаблон таблицы (скопируйте заголовок при необходимости расширения):

| Дата (UTC) | Шаг (кратко) | Коммит до | Коммит после | sheetOpen median до (ms) | sheetOpen median после (ms) | max до | max после | Примечание |
|------------|--------------|-----------|----------------|---------------------------|------------------------------|--------|-----------|------------|
| 2026-04-17 | collect: фазы cold open (`preRender*` + `_preRender` листа, `renderActorSheet4e`, match `actor`) — **не код модуля**, `tools/foundry-sheet-e2e` | 4be2b4d | cad0ca4 | 3527 (прогон `…159345`, фазы `?/?`) | 3507 (`…330201`) | — | — | `coldOpenPhasingMs`: start→pre ≈2715ms, pre→hook ≈562ms, hook→rAF ≈231ms. Клиент FVTT до F5: `0.3.0`, диск `module.json`/`package.json` **0.4.0**. |
| 2026-04-17 | модуль 0.5.0: `lazySheetListFastMetrics` в JSON collect при включённом `logSheetListFastAggregates` + глобальный снимок после prep | 5d819ae | *(после push)* | — | — | — | — | См. новый JSON после F5 и включения настройки в мире; иначе в логе подсказка про настройку. |

Правила ведения: см. [PERF-WORKFLOW.md](PERF-WORKFLOW.md).
