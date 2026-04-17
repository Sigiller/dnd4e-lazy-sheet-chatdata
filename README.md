# dnd4e-lazy-sheet-chatdata

Модуль Foundry VTT 13 для dnd4e: ускорение первого открытия листа за счёт отложенного `getChatData` / части `enrichHTML` на свёрнутых строках и связанных патчей (`lib/*`). Требуется **lib-wrapper**.

## Разработка

- Каталог модуля в данных Foundry: `Data/modules/dnd4e-lazy-sheet-chatdata` (или симлинк из этого репозитория).
- Замеры: `tools/foundry-sheet-e2e` — `npm run collect`; в JSON пишется `lazyModuleReport` (версия из `module.json`, git commit, версия из клиента `game.modules`).

## Версионирование

Меняйте поле **`version`** в `module.json` при релизах; для сравнения прогонов используйте git-теги или коммиты вместе с отчётами `sheet-perf-collect-*.json`.
