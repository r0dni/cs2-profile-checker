const i18n = {
  ru: {
    appTitle: "CS2 Profile Checker",
    tabProfile: "Профиль",
    tabLive: "🎮 Live Матч",
    profileLabel: "Steam ID / Ссылка на профиль",
    profilePlaceholder: "Введите Steam ID или ссылку...",
    errorMsg: "Введите корректный Steam ID или URL.",
    trackersTitle: "Трекеры",
    noteTitle: "Заметка по игроку",
    notePlaceholder: "Заметка по игроку (подозрение в софте, твинк...)",
    deleteNoteBtn: "Удалить заметку",
    exportBtn: "📥 Экспорт",
    importBtn: "📤 Импорт",
    viewAllNotesBtn: "📋 Все заметки",
    settingsTitle: "Настройки",
    langLabel: "Язык интерфейса",
    autoPasteLabel: "Авто-вставка из буфера при открытии",
    autoOpenTitle: "Авто-открытие трекеров при вводе ID",
    tagsManagerLabel: "Конструктор быстрых тегов",
    addTagBtn: "Добавить",
    tagNamePlaceholder: "Имя тега...",
    allNotesTitle: "Сохраненные заметки",
    searchPlaceholder: "Поиск по SteamID или заметке...",
    clipboardEmpty: "Буфер обмена пуст.",
    clipboardError: "Не удалось прочитать буфер обмена.",
    notSteamTab: "Текущая вкладка не является страницей профиля Steam.",
    savedStatus: "Сохранено",
    savingStatus: "Сохранение...",
    deletedStatus: "Удалено",
    enterIdStatus: "Введите ID игрока",
    importedSuccess: "Заметки успешно импортированы!",
    importError: "Ошибка при чтении JSON файла.",
    invalidBackup: "Неверный формат файла бэкапа.",
    noNotesFound: "Заметки не найдены",
    tagNameRequired: "Введите имя тега.",
    gsiWaiting: "Ожидание подключения к GSI (порт 3000)...",
    gsiConnected: "Подключено к CS2 (GSI Active)",
    gsiDisconnected: "Отключено от GSI",
    teamT: "Команда T",
    teamCT: "Команда CT",
    noPlayersLive: "Нет данных об игроках",
    mapLabel: "Карта: ",
    scoreLabel: "Счет: "
  },
  en: {
    appTitle: "CS2 Profile Checker",
    tabProfile: "Profile",
    tabLive: "🎮 Live Match",
    profileLabel: "Steam ID / Profile URL",
    profilePlaceholder: "Enter Steam profile URL or ID...",
    errorMsg: "Please enter a valid Steam ID or URL.",
    trackersTitle: "Trackers",
    noteTitle: "Player Note",
    notePlaceholder: "Player note (suspicious, smurf...)",
    deleteNoteBtn: "Delete Note",
    exportBtn: "📥 Export",
    importBtn: "📤 Import",
    viewAllNotesBtn: "📋 All Notes",
    settingsTitle: "Settings",
    langLabel: "Language",
    autoPasteLabel: "Auto-paste from clipboard on open",
    autoOpenTitle: "Auto-open trackers on ID input",
    tagsManagerLabel: "Quick Tags Manager",
    addTagBtn: "Add",
    tagNamePlaceholder: "Tag name...",
    allNotesTitle: "Saved Notes",
    searchPlaceholder: "Search by SteamID or note...",
    clipboardEmpty: "Clipboard is empty.",
    clipboardError: "Failed to read clipboard.",
    notSteamTab: "Current tab is not a Steam profile page.",
    savedStatus: "Saved",
    savingStatus: "Saving...",
    deletedStatus: "Deleted",
    enterIdStatus: "Enter player ID",
    importedSuccess: "Notes successfully imported!",
    importError: "Error reading JSON file.",
    invalidBackup: "Invalid backup file format.",
    noNotesFound: "No notes found",
    tagNameRequired: "Tag name is required.",
    gsiWaiting: "Waiting for GSI connection (port 3000)...",
    gsiConnected: "Connected to CS2 (GSI Active)",
    gsiDisconnected: "Disconnected from GSI",
    teamT: "Team T",
    teamCT: "Team CT",
    noPlayersLive: "No players data",
    mapLabel: "Map: ",
    scoreLabel: "Score: "
  }
};

const DEFAULT_TAGS = [
  { name: "Софт", color: "danger" },
  { name: "Токсик", color: "danger" },
  { name: "Твинк", color: "warning" },
  { name: "Хороший игрок", color: "success" }
];

const storage = {
  get(keys, callback) {
    if (chrome.storage.sync) {
      chrome.storage.sync.get(keys, (res) => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.get(keys, callback);
        } else {
          callback(res);
        }
      });
    } else {
      chrome.storage.local.get(keys, callback);
    }
  },
  set(items, callback) {
    if (chrome.storage.sync) {
      chrome.storage.sync.set(items, () => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.set(items, callback);
        } else if (callback) {
          callback();
        }
      });
    } else {
      chrome.storage.local.set(items, callback);
    }
  },
  remove(keys, callback) {
    if (chrome.storage.sync) {
      chrome.storage.sync.remove(keys, () => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.remove(keys, callback);
        } else if (callback) {
          callback();
        }
      });
    } else {
      chrome.storage.local.remove(keys, callback);
    }
  }
};

async function resolveToSteamID64(input) {
  if (!input) return null;
  input = input.trim();
  if (!input) return null;

  let rawId = input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('steamcommunity.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        if (parts[0] === 'profiles') {
          return parts[1];
        }
        if (parts[0] === 'id') {
          rawId = parts[1];
        }
      }
    }
  } catch (e) {}

  if (/^\d{17}$/.test(rawId)) {
    return rawId;
  }

  try {
    const response = await fetch(`https://steamcommunity.com/id/${rawId}/?xml=1`);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const steamID64Node = xmlDoc.getElementsByTagName('steamID64')[0];
    if (steamID64Node && steamID64Node.textContent) {
      return steamID64Node.textContent.trim();
    }
  } catch (err) {}

  return rawId;
}

document.addEventListener('DOMContentLoaded', async () => {
  const profileInput = document.getElementById('profileInput');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const errorMsg = document.getElementById('errorMsg');
  const pasteClipboardBtn = document.getElementById('pasteClipboardBtn');
  const tabUrlBtn = document.getElementById('tabUrlBtn');
  const cstrackerBtn = document.getElementById('cstrackerBtn');
  const cs2trackerBtn = document.getElementById('cs2trackerBtn');
  const faceitFinderBtn = document.getElementById('faceitFinderBtn');
  const csstatsBtn = document.getElementById('csstatsBtn');
  const playerNote = document.getElementById('playerNote');
  const noteStatus = document.getElementById('noteStatus');
  const deleteNoteBtn = document.getElementById('deleteNoteBtn');
  const tagsContainer = document.getElementById('tagsContainer');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');
  const viewAllNotesBtn = document.getElementById('viewAllNotesBtn');
  const allNotesModal = document.getElementById('allNotesModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalSearchInput = document.getElementById('modalSearchInput');
  const notesListContainer = document.getElementById('notesListContainer');

  // Tabs
  const profileTabBtn = document.getElementById('profileTabBtn');
  const liveTabBtn = document.getElementById('liveTabBtn');
  const profileScreen = document.getElementById('profileScreen');
  const liveMatchScreen = document.getElementById('liveMatchScreen');

  // Live match elements
  const gsiIndicator = document.getElementById('gsiIndicator');
  const gsiStatusText = document.getElementById('gsiStatusText');
  const debugInfo = document.getElementById('debugInfo');
  const matchInfoCard = document.getElementById('matchInfoCard');
  const matchMap = document.getElementById('matchMap');
  const matchScore = document.getElementById('matchScore');
  const teamTList = document.getElementById('teamTList');
  const teamCTList = document.getElementById('teamCTList');

  // Settings elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const langSelect = document.getElementById('langSelect');
  const autoPasteCheckbox = document.getElementById('autoPasteCheckbox');
  
  const autoOpenCstracker = document.getElementById('autoOpenCstracker');
  const autoOpenCs2tracker = document.getElementById('autoOpenCs2tracker');
  const autoOpenFaceit = document.getElementById('autoOpenFaceit');
  const autoOpenCsstats = document.getElementById('autoOpenCsstats');

  const customTagsList = document.getElementById('customTagsList');
  const newTagName = document.getElementById('newTagName');
  const newTagColor = document.getElementById('newTagColor');
  const addTagBtn = document.getElementById('addTagBtn');

  let currentLang = 'ru';
  let autoPasteEnabled = true;
  let autoOpenSettings = { cstracker: false, cs2tracker: false, faceit: false, csstats: false };
  let customTags = [...DEFAULT_TAGS];
  let debounceTimer = null;
  let lastAutoOpenedId = null;
  let gsiPollInterval = null;

  // Tab switching
  profileTabBtn.addEventListener('click', () => {
    profileTabBtn.classList.add('active');
    liveTabBtn.classList.remove('active');
    profileScreen.classList.remove('hidden');
    liveMatchScreen.classList.add('hidden');
    stopGsiPolling();
  });

  liveTabBtn.addEventListener('click', () => {
    liveTabBtn.classList.add('active');
    profileTabBtn.classList.remove('active');
    liveMatchScreen.classList.remove('hidden');
    profileScreen.classList.add('hidden');
    startGsiPolling();
  });

  async function processInputAndLoad(inputVal, triggerOpen = false) {
    const resolvedId = await resolveToSteamID64(inputVal);
    if (resolvedId) {
      loadNoteForIdentifier(resolvedId);
      if (triggerOpen) {
        triggerAutoOpen(resolvedId);
      }
    }
    return resolvedId;
  }

  // Load settings & apply i18n
  storage.get(['language', 'auto_paste', 'auto_open_trackers', 'custom_tags'], async (res) => {
    if (res.language) currentLang = res.language;
    if (res.auto_paste !== undefined) autoPasteEnabled = res.auto_paste;
    if (res.auto_open_trackers) autoOpenSettings = { ...autoOpenSettings, ...res.auto_open_trackers };
    if (res.custom_tags && Array.isArray(res.custom_tags)) customTags = res.custom_tags;

    langSelect.value = currentLang;
    autoPasteCheckbox.checked = autoPasteEnabled;
    autoOpenCstracker.checked = autoOpenSettings.cstracker;
    autoOpenCs2tracker.checked = autoOpenSettings.cs2tracker;
    autoOpenFaceit.checked = autoOpenSettings.faceit;
    autoOpenCsstats.checked = autoOpenSettings.csstats;

    applyI18n(currentLang);
    renderQuickTags();
    renderCustomTagsSettings();

    if (autoPasteEnabled) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
          const cleaned = clipboardText.trim();
          if (cleaned.includes('steamcommunity.com') || /^\d{17}$/.test(cleaned) || /^[a-zA-Z0-9_-]{3,}$/.test(cleaned)) {
            profileInput.value = cleaned;
            await processInputAndLoad(cleaned, true);
          }
        }
      } catch (err) {}
    }
  });

  function applyI18n(lang) {
    const dict = i18n[lang] || i18n.ru;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
    if (dict.profilePlaceholder) profileInput.placeholder = dict.profilePlaceholder;
    if (dict.notePlaceholder) playerNote.placeholder = dict.notePlaceholder;
    if (dict.tagNamePlaceholder) newTagName.placeholder = dict.tagNamePlaceholder;
    if (dict.searchPlaceholder) modalSearchInput.placeholder = dict.searchPlaceholder;
  }

  langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    storage.set({ language: currentLang }, () => {
      applyI18n(currentLang);
    });
  });

  autoPasteCheckbox.addEventListener('change', () => {
    autoPasteEnabled = autoPasteCheckbox.checked;
    storage.set({ auto_paste: autoPasteEnabled });
  });

  function saveAutoOpenSettings() {
    autoOpenSettings = {
      cstracker: autoOpenCstracker.checked,
      cs2tracker: autoOpenCs2tracker.checked,
      faceit: autoOpenFaceit.checked,
      csstats: autoOpenCsstats.checked
    };
    storage.set({ auto_open_trackers: autoOpenSettings });
  }

  autoOpenCstracker.addEventListener('change', saveAutoOpenSettings);
  autoOpenCs2tracker.addEventListener('change', saveAutoOpenSettings);
  autoOpenFaceit.addEventListener('change', saveAutoOpenSettings);
  autoOpenCsstats.addEventListener('change', saveAutoOpenSettings);

  settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
  });

  function triggerAutoOpen(identifier) {
    if (!identifier || identifier === lastAutoOpenedId) return;
    lastAutoOpenedId = identifier;

    if (autoOpenSettings.cstracker) {
      chrome.tabs.create({ url: `https://cstracker.gg/players/${identifier}` });
    }
    if (autoOpenSettings.cs2tracker) {
      chrome.tabs.create({ url: `https://cs2tracker.gg/stats/${identifier}` });
    }
    if (autoOpenSettings.faceit) {
      chrome.tabs.create({ url: `https://faceitfinder.com/profile/${identifier}` });
    }
    if (autoOpenSettings.csstats) {
      chrome.tabs.create({ url: `https://csstats.gg/player/${identifier}` });
    }
  }

  function renderQuickTags() {
    tagsContainer.innerHTML = '';
    customTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-btn';
      btn.setAttribute('data-color', tag.color);
      btn.setAttribute('data-tag', tag.name);
      btn.textContent = tag.name;
      btn.addEventListener('click', () => {
        const current = playerNote.value.trim();
        playerNote.value = current ? `${current}, ${tag.name}` : tag.name;
        playerNote.dispatchEvent(new Event('input'));
      });
      tagsContainer.appendChild(btn);
    });
  }

  function renderCustomTagsSettings() {
    customTagsList.innerHTML = '';
    customTags.forEach((tag, index) => {
      const item = document.createElement('div');
      item.className = 'custom-tag-item';
      item.innerHTML = `
        <span class="tag-badge" data-color="${tag.color}">${tag.name}</span>
        <button type="button" class="delete-tag-btn" data-index="${index}">✕</button>
      `;
      customTagsList.appendChild(item);
    });

    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        customTags.splice(idx, 1);
        storage.set({ custom_tags: customTags }, () => {
          renderQuickTags();
          renderCustomTagsSettings();
        });
      });
    });
  }

  addTagBtn.addEventListener('click', () => {
    const name = newTagName.value.trim();
    const color = newTagColor.value;
    const dict = i18n[currentLang] || i18n.ru;

    if (!name) {
      alert(dict.tagNameRequired || 'Tag name is required.');
      return;
    }

    customTags.push({ name, color });
    newTagName.value = '';
    storage.set({ custom_tags: customTags }, () => {
      renderQuickTags();
      renderCustomTagsSettings();
    });
  });

  function loadNoteForIdentifier(identifier) {
    if (!identifier) {
      playerNote.value = '';
      noteStatus.textContent = '';
      return;
    }
    storage.get([identifier], (result) => {
      if (result && result[identifier]) {
        playerNote.value = result[identifier];
        noteStatus.textContent = '';
      } else {
        playerNote.value = '';
        noteStatus.textContent = '';
      }
    });
  }

  clearInputBtn.addEventListener('click', () => {
    profileInput.value = '';
    errorMsg.classList.add('hidden');
    profileInput.classList.remove('error');
    playerNote.value = '';
    noteStatus.textContent = '';
    lastAutoOpenedId = null;
    profileInput.focus();
  });

  pasteClipboardBtn.addEventListener('click', async () => {
    const dict = i18n[currentLang] || i18n.ru;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.trim();
        profileInput.value = cleaned;
        errorMsg.classList.add('hidden');
        profileInput.classList.remove('error');
        await processInputAndLoad(cleaned, true);
      } else {
        alert(dict.clipboardEmpty);
      }
    } catch (err) {
      alert(dict.clipboardError);
    }
  });

  tabUrlBtn.addEventListener('click', () => {
    const dict = i18n[currentLang] || i18n.ru;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        if (url.includes('steamcommunity.com')) {
          profileInput.value = url;
          errorMsg.classList.add('hidden');
          profileInput.classList.remove('error');
          await processInputAndLoad(url, true);
        } else {
          alert(dict.notSteamTab);
        }
      }
    });
  });

  async function handleRedirect(urlBuilder) {
    const rawValue = profileInput.value;
    const identifier = await resolveToSteamID64(rawValue);

    if (!identifier) {
      errorMsg.classList.add('hidden');
      profileInput.classList.add('error');
      return;
    }

    errorMsg.classList.add('hidden');
    profileInput.classList.remove('error');

    const targetUrl = urlBuilder(identifier);
    chrome.tabs.create({ url: targetUrl });
  }

  cstrackerBtn.addEventListener('click', async () => {
    await handleRedirect(id => `https://cstracker.gg/players/${id}`);
  });

  cs2trackerBtn.addEventListener('click', async () => {
    await handleRedirect(id => `https://cs2tracker.gg/stats/${id}`);
  });

  faceitFinderBtn.addEventListener('click', async () => {
    await handleRedirect(id => `https://faceitfinder.com/profile/${id}`);
  });

  csstatsBtn.addEventListener('click', async () => {
    await handleRedirect(id => `https://csstats.gg/player/${id}`);
  });

  profileInput.addEventListener('input', async () => {
    if (errorMsg && !errorMsg.classList.contains('hidden')) {
      errorMsg.classList.add('hidden');
      profileInput.classList.remove('error');
    }
    const val = profileInput.value;
    const identifier = await resolveToSteamID64(val);
    loadNoteForIdentifier(identifier);
    
    if (identifier && (/^\d{17}$/.test(identifier) || val.includes('steamcommunity.com'))) {
      triggerAutoOpen(identifier);
    }
  });

  playerNote.addEventListener('input', async () => {
    const dict = i18n[currentLang] || i18n.ru;
    const identifier = await resolveToSteamID64(profileInput.value);
    if (!identifier) {
      noteStatus.textContent = dict.enterIdStatus;
      return;
    }

    const noteText = playerNote.value;
    noteStatus.textContent = dict.savingStatus;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      storage.set({ [identifier]: noteText }, () => {
        noteStatus.textContent = dict.savedStatus;
        setTimeout(() => {
          if (noteStatus.textContent === dict.savedStatus) {
            noteStatus.textContent = '';
          }
        }, 2000);
      });
    }, 500);
  });

  deleteNoteBtn.addEventListener('click', async () => {
    const dict = i18n[currentLang] || i18n.ru;
    const identifier = await resolveToSteamID64(profileInput.value);
    if (!identifier) {
      playerNote.value = '';
      noteStatus.textContent = '';
      return;
    }

    storage.remove(identifier, () => {
      playerNote.value = '';
      noteStatus.textContent = dict.deletedStatus;
      setTimeout(() => {
        if (noteStatus.textContent === dict.deletedStatus) {
          noteStatus.textContent = '';
        }
      }, 2000);
    });
  });

  exportBtn.addEventListener('click', () => {
    storage.get(null, (items) => {
      const exportData = { ...items };
      delete exportData.custom_tags;
      delete exportData.language;
      delete exportData.auto_paste;
      delete exportData.auto_open_trackers;

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "cs2_notes_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  });

  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (event) => {
    const dict = i18n[currentLang] || i18n.ru;
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (typeof importedData === 'object' && importedData !== null) {
          storage.set(importedData, async () => {
            alert(dict.importedSuccess);
            const identifier = await resolveToSteamID64(profileInput.value);
            loadNoteForIdentifier(identifier);
          });
        } else {
          alert(dict.invalidBackup);
        }
      } catch (err) {
        alert(dict.importError);
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  function renderNotesList(filterQuery = '') {
    notesListContainer.innerHTML = '';
    const dict = i18n[currentLang] || i18n.ru;

    storage.get(null, (items) => {
      const excludeKeys = ['custom_tags', 'language', 'auto_paste', 'auto_open_trackers'];
      const keys = Object.keys(items).filter(k => !excludeKeys.includes(k));
      const query = filterQuery.toLowerCase();

      const filteredKeys = keys.filter(key => {
        const note = items[key] || '';
        return key.toLowerCase().includes(query) || note.toLowerCase().includes(query);
      });

      if (filteredKeys.length === 0) {
        notesListContainer.innerHTML = `<div class="no-notes">${dict.noNotesFound}</div>`;
        return;
      }

      filteredKeys.forEach(key => {
        const noteText = items[key];
        const itemEl = document.createElement('div');
        itemEl.className = 'note-item';
        itemEl.innerHTML = `
          <div class="note-item-id">${key}</div>
          <div class="note-item-text">${noteText}</div>
        `;
        itemEl.addEventListener('click', () => {
          profileInput.value = key;
          loadNoteForIdentifier(key);
          triggerAutoOpen(key);
          allNotesModal.classList.add('hidden');
        });
        notesListContainer.appendChild(itemEl);
      });
    });
  }

  viewAllNotesBtn.addEventListener('click', () => {
    modalSearchInput.value = '';
    renderNotesList();
    allNotesModal.classList.remove('hidden');
  });

  closeModalBtn.addEventListener('click', () => {
    allNotesModal.classList.add('hidden');
  });

  allNotesModal.addEventListener('click', (e) => {
    if (e.target === allNotesModal) {
      allNotesModal.classList.add('hidden');
    }
  });

  modalSearchInput.addEventListener('input', () => {
    renderNotesList(modalSearchInput.value);
  });

  // GSI Polling (3 seconds interval)
  function startGsiPolling() {
    if (gsiPollInterval) clearInterval(gsiPollInterval);
    pollGsiState();
    gsiPollInterval = setInterval(pollGsiState, 3000);
  }

  function stopGsiPolling() {
    if (gsiPollInterval) {
      clearInterval(gsiPollInterval);
      gsiPollInterval = null;
    }
  }

  async function pollGsiState() {
    const dict = i18n[currentLang] || i18n.ru;
    try {
      const res = await fetch('http://127.0.0.1:3000/status');
      const data = await res.json();

      if (data && data.connected) {
        gsiIndicator.className = 'gsi-dot connected';
        gsiStatusText.textContent = dict.gsiConnected;
        if (debugInfo) {
          debugInfo.textContent = `Players: ${(data.players || []).length} | GSI Keys: ${(data.rawKeys || []).join(', ')}`;
        }
        
        if (data.map) {
          matchInfoCard.classList.remove('hidden');
          matchMap.textContent = `${dict.mapLabel}${data.map.name || '-'}`;
          matchScore.textContent = `${dict.scoreLabel}CT ${data.map.score_ct || 0} : T ${data.map.score_t || 0}`;
        }

        renderLiveTeams(data.players || []);
      } else {
        gsiIndicator.className = 'gsi-dot disconnected';
        gsiStatusText.textContent = dict.gsiWaiting;
        if (debugInfo) {
          debugInfo.textContent = 'GSI Keys: none (Disconnected)';
        }
        matchInfoCard.classList.add('hidden');
        teamTList.innerHTML = `<div class="no-notes">${dict.noPlayersLive}</div>`;
        teamCTList.innerHTML = `<div class="no-notes">${dict.noPlayersLive}</div>`;
      }
    } catch (err) {
      gsiIndicator.className = 'gsi-dot disconnected';
      gsiStatusText.textContent = dict.gsiWaiting;
        if (debugInfo) {
          debugInfo.textContent = 'GSI Keys: none (Disconnected)';
        }
      matchInfoCard.classList.add('hidden');
      teamTList.innerHTML = `<div class="no-notes">${dict.noPlayersLive}</div>`;
      teamCTList.innerHTML = `<div class="no-notes">${dict.noPlayersLive}</div>`;
    }
  }

  function renderLiveTeams(players) {
    teamTList.innerHTML = '';
    teamCTList.innerHTML = '';

    const tPlayers = players.filter(p => p.team === 'T');
    const ctPlayers = players.filter(p => p.team === 'CT');

    if (tPlayers.length === 0) teamTList.innerHTML = '<div class="no-notes">-</div>';
    if (ctPlayers.length === 0) teamCTList.innerHTML = '<div class="no-notes">-</div>';

    const steamIds = players.map(p => p.steamId);
    storage.get(steamIds, (notesMap) => {
      tPlayers.forEach(p => renderPlayerCard(p, teamTList, notesMap[p.steamId]));
      ctPlayers.forEach(p => renderPlayerCard(p, teamCTList, notesMap[p.steamId]));
    });
  }

  function renderPlayerCard(player, container, noteText) {
    const card = document.createElement('div');
    card.className = 'live-player-card';

    let noteHtml = noteText ? `<div class="live-player-note">${noteText}</div>` : '';

    card.innerHTML = `
      <div class="live-player-header">
        <span class="live-player-name" title="${player.name}">${player.name}</span>
        <span class="live-player-id">${player.steamId}</span>
      </div>
      ${noteHtml}
      <div class="live-player-trackers">
        <button class="live-tracker-link" data-url="https://cstracker.gg/players/${player.steamId}">CST</button>
        <button class="live-tracker-link" data-url="https://cs2tracker.gg/stats/${player.steamId}">CS2T</button>
        <button class="live-tracker-link" data-url="https://faceitfinder.com/profile/${player.steamId}">FF</button>
        <button class="live-tracker-link" data-url="https://csstats.gg/player/${player.steamId}">CSS</button>
      </div>
    `;

    card.querySelectorAll('.live-tracker-link').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: btn.getAttribute('data-url') });
      });
    });

    container.appendChild(card);
  }
});
