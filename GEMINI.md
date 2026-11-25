\# Правила проекта CS2 Profile Checker



\## 1. Среда выполнения и терминал

\- ОС: Windows, оболочка по умолчанию — \*\*PowerShell\*\*.

\- Разделяй команды только через `;` (никогда не используй `\&\&`).

\- Перед коммитом проверяй синтаксис JS через `node --check gsi/server.js` и `node --check popup.js`.



\## 2. Экономия токенов (MCP token-optimizer)

\- \*\*Обязательно\*\* используй инструменты `token-optimizer` (`smart\_read`, `smart\_edit`, `smart\_grep`, `smart\_glob`) вместо стандартного полного чтения крупных файлов (`popup.js`, `styles.css`, `gsi/server.js`).

\- Не запрашивай лишние скриншоты в Playwright без необходимости — для анализа DOM используй `browser\_snapshot`.



\## 3. Архитектура и ограничения стека

\- \*\*Chrome Extension (Manifest V3):\*\* запрещены inline-скрипты и inline-обработчики (`onclick="..."`) в `popup.html`. Вся логика — только в `popup.js`.

\- \*\*Локальный GSI-сервер (`gsi/server.js`):\*\* работает на `http://127.0.0.1:3000`.

\- \*\*Логика GSI:\*\* Valve присылает пакеты фрагментами. `sessionPlayers` должен работать как накопительный кэш и очищаться ТОЛЬКО при смене `data.map.name` или при таймауте неактивности (> 30–60 сек). `lastMapObj` должен сохраняться между пакетами без узла `map`.

\- Для актуальной документации по Chrome Extensions API и Node.js обращайся к MCP `context7`.



\## 4. Тестирование и QA

\- Для проверки UI и регрессий используй связку с агентом `@qa-reviewer` и MCP `playwright` (`browser\_navigate`, `browser\_snapshot`, `browser\_console\_messages`, `browser\_network\_requests`).

\- При проверке интерфейса всегда контролируй отсутствие ошибок в консоли браузера и корректную работу как в popup-окне (`width <= 420px`), так и в режиме `detached`.


## 5. База знаний проекта (token-optimizer)
- В начале новой сессии запрашивай контекст через `wiki_query` из `token-optimizer`.
- После крупных правок структуры файлов или формата GSI записывай краткую сводку через `wiki_write`.
