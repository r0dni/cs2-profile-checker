<a name="russian"></a>
# CS2 Profile Checker (Chrome Extension + GSI Server)

Утилита для Counter-Strike 2, состоящая из расширения для Google Chrome и локального Node.js GSI (Game State Integration) сервера, предназначенная для быстрого просмотра профилей игроков, управления заметками, тегами и отслеживания динамической статистики Live-матча в реальном времени.

---

## 🌟 Возможности / Features

- **Live-статистика матча**: Отображение информации о картах, счете, командах T/CT и ростерах игроков.
- **Индивидуальная статистика в реальном времени**: Здоровье (HP), Броня и Шлем (🛡️/🪖), Деньги ($) и K/D/A (Убийства/Смерти/Ассисты).
- **Быстрые трекеры**: Мгновенный переход к профилям игроков на CSTracker, CS2Tracker, Faceit Finder и CSStats.
- **Заметки и цветные теги**: Локальное сохранение заметок и быстрых тегов (Софт, Токсик, Твинк) для каждого игрока через `chrome.storage`.
- **Отсоединяемое окно**: Кнопка быстрого вывода интерфейса расширения в отдельное плавающее окно (Pop-up window).
- **Поддержка режимов**: Совместимость с Matchmaking, Premier, Casual, Deathmatch и Wingman.

---

## 📦 Установка и запуск / Installation

1. **Клонируйте или скачайте репозиторий**:
   ```bash
   git clone https://github.com/r0dni/cs2-profile-checker.git
   ```

2. **Установите расширение в Google Chrome**:
   - Откройте браузер и перейдите по адресу: `chrome://extensions/`.
   - Включите **Режим разработчика** (Developer mode) в правом верхнем углу.
   - Нажмите **Загрузить распакованное расширение** (Load unpacked) и выберите папку проекта `cs2-profile-checker`.

3. **Настройте Game State Integration (GSI) для CS2**:
   - Скопируйте файл `gsi/gamestate_integration_cs2checker.cfg` в директорию конфигурации CS2:
     `\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg\` (или в ваш путь установки CS2).

4. **Запустите локальный GSI сервер**:
   - Убедитесь, что у вас установлен [Node.js](https://nodejs.org/).
   - В терминале перейдите в папку проекта и запустите сервер:
     ```bash
     node gsi/server.js
     ```
   - Либо запустите сервер в скрытом фоновом режиме (без отдельного окна консоли Windows):
     - Дважды кликните по файлу `gsi/start_gsi_hidden.vbs` (или запустите `wscript gsi/start_gsi_hidden.vbs`).
   - Сервер запустится на `http://127.0.0.1:3000`.

---

<a name="english"></a>
# CS2 Profile Checker (Chrome Extension + GSI Server)

A utility for Counter-Strike 2 combining a Google Chrome extension and a local Node.js GSI (Game State Integration) server designed for quick player profile checks, notes/tags management, and real-time dynamic Live match statistics tracking.

---

## 🚀 Key Features

- **Live Match Statistics**: Real-time display of map info, match score, T/CT teams, and player rosters.
- **Real-time Player Stats**: Health (HP), Armor/Helmet (🛡️/🪖), Money ($), and K/D/A.
- **Instant Trackers**: Quick links to CSTracker, CS2Tracker, Faceit Finder, and CSStats.
- **Notes & Colored Tags**: Local persistence of custom notes and quick tags per player via `chrome.storage`.
- **Detachable Window**: Button to pop out the extension interface into a standalone window.
- **Mode Support**: Fully compatible with Matchmaking, Premier, Casual, Deathmatch, and Wingman.

---

## 👨‍💻 Developer

**Rodni** (`@r0dni`)

---

## 📄 License

MIT
