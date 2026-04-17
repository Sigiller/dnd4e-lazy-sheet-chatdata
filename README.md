# dnd4e-lazy-sheet-chatdata

Модуль Foundry VTT 13 для dnd4e: ускорение первого открытия листа за счёт отложенного `getChatData` / части `enrichHTML` на свёрнутых строках и связанных патчей (`lib/*`). Требуется **lib-wrapper**.

Репозиторий (приватный): https://github.com/Sigiller/dnd4e-lazy-sheet-chatdata

## Разработка

- Каталог модуля в данных Foundry: `Data/modules/dnd4e-lazy-sheet-chatdata` (или симлинк из этого репозитория).
- Замеры: `tools/foundry-sheet-e2e` — `npm run collect`; в JSON пишется `lazyModuleReport` (версия из `module.json`, git commit, версия из клиента `game.modules`).

## Версионирование

Поле **`version`** в **`module.json`** — то, что видит Foundry. Корневой **`package.json`** дублирует ту же semver **для отчётов** (`lazyModuleReport.disk.packageJson` в collect). После изменений кода модуля перед замером поднимайте минор в **обоих** файлах синхронно; для сравнения прогонов используйте git-коммиты и JSON collect.

## Доработка производительности (процесс)

Один шаг за раз, сравнение collect до/после, запись в журнал; при ухудшении — разбор или откат перед следующим шагом. Подробно: [docs/PERF-WORKFLOW.md](docs/PERF-WORKFLOW.md), журнал: [docs/PERF-RESULTS.md](docs/PERF-RESULTS.md).
