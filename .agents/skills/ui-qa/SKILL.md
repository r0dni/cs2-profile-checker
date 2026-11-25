---
name: ui-qa
description: Инструкции и сценарии регрессионной проверки UI расширения (popup.html / popup.js) и связки с GSI-сервером (127.0.0.1:3000) с использованием Playwright и @qa-reviewer
---

# UI QA Skill: Регрессионная проверка интерфейса и GSI-связки

Этот скилл предназначен для сквозного тестирования интерфейса Chrome-расширения (`popup.html` / `popup.js`) в связке с локальным GSI-сервером (`127.0.0.1:3000`), валидации отсутствия регрессий в DOM/консоли, проверки адаптивности и передачи отчета независимому инженеру `@qa-reviewer`.

---

## 🎯 Что проверяется

1. **Доступность GSI-сервера (`127.0.0.1:3000`)**:
   - Синтаксис `node --check gsi/server.js`.
   - Ответ эндпоинта `/status`.
   - При необходимости — автоматический запуск сервера в фоновом режиме.
2. **Открытие UI в Playwright и снимок DOM**:
   - Навигация на `popup.html` (локальный файл `file://...` или через локальный статический сервер).
   - Снятие `browser_snapshot` структуры элементов интерфейса.
3. **Консоль и Сеть**:
   - `browser_console_messages`: отсутствие JS-ошибок (Unhandled exceptions), нарушений CSP (Content Security Policy) и ошибок доступа к `chrome.storage`.
   - `browser_network_requests`: корректность поллинга `/status` и отсутствие заблокированных сетевых вызовов.
4. **Стабильность состояния карточек и безопасность (XSS / Escaping)**:
   - Сохранение раскрытого состояния аккордеона карточки игрока (`expanded` / `details`) при повторном цикле обновления GSI (ожидание > 3–4 секунд через `browser_wait_for`).
   - Корректное экранирование спецсимволов и HTML в никнеймах игроков (`<script>`, `<img>`, `&`, `"`, `'`).
5. **Адаптивность (Narrow vs Detached)**:
   - Проверка рендеринга в узком окне (режим всплывающего popup, ширина `width <= 420px`).
   - Проверка в широком окне (режим отдельного окна `detached`, ширина `> 420px`).
6. **Ревью через `@qa-reviewer`**:
   - Формирование структурированного отчета и запуск сабагента `@qa-reviewer` для проверки на баги и edge cases.

---

## 📋 Требования к среде и правила

> [!IMPORTANT]
> В соответствии с `GEMINI.md`:
> - ОС: **Windows**, оболочка по умолчанию — **PowerShell**.
> - Команды разделяются **только через `;`** (никогда не использовать `&&`).
> - Не запрашивать лишние скриншоты в Playwright без необходимости — для анализа DOM использовать `browser_snapshot`.
> - Перед коммитом и тестами проверять: `node --check gsi/server.js; node --check popup.js`.

---

## 🚀 Пошаговый сценарий тестирования

### Шаг 1. Валидация синтаксиса и проверка готовности GSI-сервера

Проверь синтаксис JS-файлов и убедись, что GSI-сервер поднят на `127.0.0.1:3000`:

```powershell
node --check gsi/server.js; node --check popup.js; $proc = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*gsi/server.js*" }; if (-not $proc) { Start-Process node -ArgumentList "gsi/server.js"; Start-Sleep -Milliseconds 800 }; Invoke-RestMethod -Uri "http://127.0.0.1:3000/status" -TimeoutSec 3
```

Ожидаемый результат: HTTP 200, возвращается JSON со структурой `{ connected: ..., map: ..., players: ... }`.

---

### Шаг 2. Подготовка тестовых данных в GSI (включая спецсимволы и XSS-пэйлоады)

Отправь тестовый пакет с игроками, один из которых содержит спецсимволы и потенциальный XSS в имени, чтобы проверить безопасность и экранирование:

```powershell
node -e "const http = require('http'); const payload = JSON.stringify({ map: { name: 'de_mirage', mode: 'competitive', phase: 'live', team_ct: { score: 7 }, team_t: { score: 5 } }, allplayers: { '76561198000000001': { name: '<script>alert(1)</script><b>T-Player</b> & \"Safe\"', team: 'T', state: { health: 85, armor: 100, helmet: true, money: 4200 }, match_stats: { kills: 12, deaths: 4, assists: 3 } }, '76561198000000002': { name: 'CT-Defender <img src=x onerror=console.error(99)>', team: 'CT', state: { health: 100, armor: 0, helmet: false, money: 1600 }, match_stats: { kills: 8, deaths: 6, assists: 1 } } } }); const req = http.request({ host: '127.0.0.1', port: 3000, path: '/', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => { console.log('Mock GSI Sent, status:', res.statusCode); }); req.on('error', console.error); req.write(payload); req.end();"
```

---

### Шаг 3. Запуск и навигация через MCP Playwright

1. **Навигация**:
   Вызови `browser_navigate` на страницу `popup.html`:
   - URL: `file:///c:/Users/Tomahawk/cs2-profile-checker/popup.html` (или локальный тестовый HTTP-сервер).
2. **Переключение на вкладку Live**:
   - Нажми на `#liveTabBtn` с помощью `browser_click`.
   - Подожди 1000 мс (`browser_wait_for` time: 1000) для первого цикла опроса GSI.
3. **Снимок DOM**:
   - Вызови `browser_snapshot` и проверь наличие элементов:
     - Индикатор `#gsiIndicator` имеет класс `connected`.
     - Наличие карточек игроков с никнеймами.
     - Проверь, что теги `<script>` и `<img>` не выполнились и отрендерились как обычный экранированный текст.

---

### Шаг 4. Проверка консоли и сетевых запросов

1. **Консоль браузера**:
   - Вызови `browser_console_messages`.
   - Убедись в отсутствии:
     - `error` / `exception` (особенно `TypeError`, `ReferenceError`).
     - Сообщений о нарушении CSP (`Refused to execute inline script`, `Refused to load...`).
     - Ошибок `chrome.storage` или `chrome.runtime`.
2. **Сетевые вызовы**:
   - Вызови `browser_network_requests`.
   - Проверь успешные HTTP 200 GET-запросы к `http://127.0.0.1:3000/status`.

---

### Шаг 5. Проверка сохранения раскрытой карточки при повторном цикле обновления

1. **Раскрытие карточки**:
   - Кликни по первой карточке игрока или кнопке деталей (`browser_click`).
   - Убедись, что раскрылась дополнительная статистика/кнопки трекеров.
2. **Ожидание цикла обновления GSI**:
   - Подожди 3–4 секунды (`browser_wait_for` time: 3500–4000), пока сработает очередной интервал опроса GSI.
3. **Проверка DOM**:
   - Сними повторный `browser_snapshot`.
   - **Критический критерий:** карточка должна **оставаться раскрытой**, фокус или аккордеон не должны самопроизвольно схлопываться при обновлении данных.

---

### Шаг 6. Проверка адаптивности (Narrow vs Wide/Detached)

1. **Узкий режим (`width <= 420px`)**:
   - Проверь верстку в стандартном окне расширения (380–420px).
   - Убедись через `browser_snapshot`, что нет горизонтального скролла, кнопки трекеров переносятся аккуратно, индикатор статуса не вылезает за пределы контейнера.
2. **Широкий режим (`width > 420px`)**:
   - Проверь в широком режиме (например, 800x600, соответствующем detached-окну).
   - Убедись, что сетка колонок команд T и CT (если поддерживается двухколоночный режим) или списки распределяются пропорционально.

---

### Шаг 7. Передача результатов на ревью `@qa-reviewer`

После завершения шагов 1–6 вызови сабагента `qa-reviewer` через `invoke_subagent`:

- **Role**: `QA Code Reviewer`
- **TypeName**: `qa-reviewer`
- **Model**: `inherit`
- **Prompt**:
  Включи в промпт:
  1. Вывод `browser_console_messages` и статус сетевых запросов.
  2. Фрагменты `browser_snapshot` до и после цикла обновления (с сохранением открытой карточки).
  3. Результаты проверки санитизации/экранирования спецсимволов.
  4. Поведение адаптивности при `<= 420px` и `> 420px`.
  5. Запрос на выявление любых потенциальных регрессий, edge cases (длинные ники, сброс соединения с GSI, утечки интервалов таймеров).

---

## 🔍 Чек-лист для отчета (QA Report Checklist)

| № | Проверка | Статус | Примечание |
|---|----------|--------|------------|
| 1 | GSI Server `/status` responds 200 | [ ] | Порт 3000 активен |
| 2 | DOM snapshot popup.html matches spec | [ ] | Элементы live-матча присутствуют |
| 3 | Console errors = 0 (No CSP / JS errors) | [ ] | Чистая консоль |
| 4 | Network requests to `/status` succeed | [ ] | Периодический опрос работает |
| 5 | Expanded player card preserved after >3s | [ ] | Не схлопывается при ререндере |
| 6 | XSS & Special characters escaped | [ ] | Никнеймы экранированы |
| 7 | Layout responsive (<=420px & >420px) | [ ] | Нет переполнений и сломанных сеток |
| 8 | Passed independent review by @qa-reviewer | [ ] | Вердикт зафиксирован |

- Для оффлайн-тестов UI без запущенного CS2 используй готовый мок-сервер `node tests/mock_server.js` (не создавай временные файлы в корне проекта).
