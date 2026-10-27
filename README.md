[Читать на русском языке](#russian) | [Read in English](#english)

---

<a name="russian"></a>
# Russian

# CS2 Profile Checker 🎯

Удобное Chrome-расширение (Manifest V3) для мгновенной проверки игровых профилей CS2, управления локальными заметками с цветными тегами и прямой интеграции с популярными статистическими трекерами.

## ✨ Основные возможности

- **Быстрый ввод**: вставка из буфера обмена в 1 клик, автоматическое чтение URL активной вкладки Steam, удобная кнопка очистки инпута.
- **Авто-резолв ссылки**: автоматическое преобразование кастомных ссылок (`/id/CustomURL`) и никнеймов в каноничный числовой `SteamID64` через Steam XML API.
- **Интеграция с трекерами**: быстрый переход в один клик на **CSTracker**, **CS2Tracker**, **Faceit Finder** и **CSStats**.
- **Авто-открытие трекеров**: гибкая настройка автоматического открытия выбранных статистических трекеров в новых вкладках при вводе или вставке ID игрока.
- **Заметки и теги**: персональные заметки по игрокам с настраиваемыми цветными тегами (Софт, Токсик, Твинк, Хороший игрок и создание собственных тегов).
- **Синхронизация и бэкап**: сохранение данных через `chrome.storage.sync` (настройки и заметки не теряются при переустановке расширения), а также полный экспорт и импорт базы в формате `.json`.
- **Мультиязычность (i18n)**: полная поддержка интерфейса на русском и английском языках с мгновенным переключением в модальном окне настроек.

## 🚀 Установка (Режим разработчика)

1. Клонируйте или скачайте данный репозиторий в папку на вашем компьютере.
2. Откройте Google Chrome и перейдите по адресу: `chrome://extensions/`
3. В правом верхнем углу включите тумблер **«Режим разработчика»** (Developer mode).
4. Нажмите кнопку **«Загрузить распакованное расширение»** (Load unpacked) в левом верхнем углу.
5. Выберите папку с проектом `cs2-profile-checker`. Расширение готово к работе!

## 🛠 Технологии

- **JavaScript (ES6+)** — логика расширения, асинхронные запросы, работа с DOM и Storage API.
- **Chrome Extension Manifest V3** — современный стандарт расширений Google Chrome.
- **Steam XML API** — резолвинг кастомных URL в SteamID64.
- **CSS3** — стилизованный темный интерфейс в эстетике Counter-Strike 2.

---

<a name="english"></a>
# English

# CS2 Profile Checker 🎯

A powerful Google Chrome extension (Manifest V3) for instant CS2 player profile checking, local note-taking with color-coded tags, and seamless integration with popular stats trackers.

## ✨ Key Features

- **Quick Input**: 1-click clipboard paste, automatic reading of active Steam tab URL, and convenient clear button.
- **Auto-Resolve Custom URL**: Automatic conversion of custom profile links (`/id/CustomURL`) and vanity URLs into standard numeric `SteamID64` via Steam XML API.
- **Tracker Integration**: One-click redirection to **CSTracker**, **CS2Tracker**, **Faceit Finder**, and **CSStats**.
- **Auto-Open Trackers**: Configurable settings to automatically open selected stats trackers in new tabs when entering or pasting a player ID.
- **Notes & Tags**: Personal player notes with customizable color-coded tags (Cheater, Toxic, Smurf, Good Player, and custom tag builder).
- **Sync & Backup**: Data persistence via `chrome.storage.sync` (notes and settings are preserved across reinstructions), plus full `.json` database export and import.
- **Localization (i18n)**: Full interface support for Russian and English languages with instant switching in settings.

## 🚀 Installation (Developer Mode)

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `cs2-profile-checker` project folder. The extension is ready to use!

## 🛠 Tech Stack

- **JavaScript (ES6+)** — extension logic, async requests, DOM and Storage API interaction.
- **Chrome Extension Manifest V3** — modern Google Chrome extension standard.
- **Steam XML API** — resolving custom URLs to SteamID64.
- **CSS3** — polished dark UI matching Counter-Strike 2 aesthetics.
