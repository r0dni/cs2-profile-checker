function extractSteamIdentifier(input) {
  if (!input) return null;
  input = input.trim();
  if (!input) return null;

  // Check if it's a steamcommunity URL (or mirror URL)
  try {
    const url = new URL(input);
    if (url.hostname.includes('steamcommunity.')) {
      const parts = url.pathname.split('/').filter(Boolean);
      // Expected formats: /profiles/{steamId64} or /id/{customName}
      if (parts.length >= 2 && (parts[0] === 'profiles' || parts[0] === 'id')) {
        return parts[1];
      }
    }
  } catch (e) {
    // Not a valid URL, treat as raw ID or custom name string
  }

  // Remove trailing slashes and return raw value
  return input.replace(/\/+$/, '');
}

document.addEventListener('DOMContentLoaded', async () => {
  const profileInput = document.getElementById('profileInput');
  const errorMsg = document.getElementById('errorMsg');
  const pasteClipboardBtn = document.getElementById('pasteClipboardBtn');
  const tabUrlBtn = document.getElementById('tabUrlBtn');
  const cstrackerBtn = document.getElementById('cstrackerBtn');
  const cs2trackerBtn = document.getElementById('cs2trackerBtn');
  const mirrorCxBtn = document.getElementById('mirrorCxBtn');
  const mirrorTipsBtn = document.getElementById('mirrorTipsBtn');
  const playerNote = document.getElementById('playerNote');
  const noteStatus = document.getElementById('noteStatus');
  const deleteNoteBtn = document.getElementById('deleteNoteBtn');

  let debounceTimer = null;

  function loadNoteForIdentifier(identifier) {
    if (!identifier) {
      playerNote.value = '';
      noteStatus.textContent = '';
      return;
    }
    chrome.storage.local.get([identifier], (result) => {
      if (result && result[identifier]) {
        playerNote.value = result[identifier];
        noteStatus.textContent = '';
      } else {
        playerNote.value = '';
        noteStatus.textContent = '';
      }
    });
  }

  // Automatically read from clipboard on load if applicable
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText) {
      const cleaned = clipboardText.trim();
      if (cleaned.includes('steamcommunity.') || /^\d{17}$/.test(cleaned) || /^[a-zA-Z0-9_-]{3,}$/.test(cleaned)) {
        profileInput.value = cleaned;
      }
    }
  } catch (err) {
    // Clipboard permission or access denied, ignore silently
  }

  // Load note for initial input value (if any)
  if (profileInput.value) {
    loadNoteForIdentifier(extractSteamIdentifier(profileInput.value));
  }

  // Manual paste from clipboard button
  pasteClipboardBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleaned = text.trim();
        profileInput.value = cleaned;
        errorMsg.classList.add('hidden');
        profileInput.classList.remove('error');
        loadNoteForIdentifier(extractSteamIdentifier(cleaned));
      } else {
        alert('Буфер обмена пуст.');
      }
    } catch (err) {
      alert('Не удалось прочитать буфер обмена. Разрешите доступ в браузере.');
    }
  });

  // Active tab URL reader
  tabUrlBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        if (url.includes('steamcommunity.')) {
          profileInput.value = url;
          errorMsg.classList.add('hidden');
          profileInput.classList.remove('error');
          loadNoteForIdentifier(extractSteamIdentifier(url));
        } else {
          alert('Current active tab is not a Steam community profile page.');
        }
      }
    });
  });

  function handleRedirect(urlBuilder) {
    const rawValue = profileInput.value;
    const identifier = extractSteamIdentifier(rawValue);

    if (!identifier) {
      errorMsg.classList.remove('hidden');
      profileInput.classList.add('error');
      return;
    }

    errorMsg.classList.add('hidden');
    profileInput.classList.remove('error');

    const targetUrl = urlBuilder(identifier);
    chrome.tabs.create({ url: targetUrl });
  }

  function handleMirrorRedirect(domainExtension) {
    const rawValue = profileInput.value.trim();
    if (!rawValue) {
      errorMsg.classList.remove('hidden');
      profileInput.classList.add('error');
      return;
    }

    let targetUrl = '';
    try {
      const url = new URL(rawValue);
      if (url.hostname.includes('steamcommunity.')) {
        url.hostname = url.hostname.replace(/steamcommunity\.[a-z.]+/, `steamcommunity.${domainExtension}`);
        targetUrl = url.toString();
      } else {
        url.hostname = `steamcommunity.${domainExtension}`;
        targetUrl = url.toString();
      }
    } catch (e) {
      const identifier = rawValue.replace(/\/+$/, '');
      const isSteamId64 = /^\d{17}$/.test(identifier);
      const pathType = isSteamId64 ? 'profiles' : 'id';
      targetUrl = `https://steamcommunity.${domainExtension}/${pathType}/${identifier}`;
    }

    errorMsg.classList.add('hidden');
    profileInput.classList.remove('error');
    chrome.tabs.create({ url: targetUrl });
  }

  cstrackerBtn.addEventListener('click', () => {
    handleRedirect(id => `https://cstracker.gg/profile/steam/${id}`);
  });

  cs2trackerBtn.addEventListener('click', () => {
    handleRedirect(id => `https://cs2tracker.gg/profile/${id}`);
  });

  mirrorCxBtn.addEventListener('click', () => {
    handleMirrorRedirect('cx');
  });

  mirrorTipsBtn.addEventListener('click', () => {
    handleMirrorRedirect('tips');
  });

  // Profile input change handler
  profileInput.addEventListener('input', () => {
    if (errorMsg && !errorMsg.classList.contains('hidden')) {
      errorMsg.classList.add('hidden');
      profileInput.classList.remove('error');
    }
    const identifier = extractSteamIdentifier(profileInput.value);
    loadNoteForIdentifier(identifier);
  });

  // Note auto-save with debounce (500ms)
  playerNote.addEventListener('input', () => {
    const identifier = extractSteamIdentifier(profileInput.value);
    if (!identifier) {
      noteStatus.textContent = 'Введите ID игрока';
      return;
    }

    const noteText = playerNote.value;
    noteStatus.textContent = 'Сохранение...';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      chrome.storage.local.set({ [identifier]: noteText }, () => {
        noteStatus.textContent = 'Сохранено';
        setTimeout(() => {
          if (noteStatus.textContent === 'Сохранено') {
            noteStatus.textContent = '';
          }
        }, 2000);
      });
    }, 500);
  });

  // Delete note button
  deleteNoteBtn.addEventListener('click', () => {
    const identifier = extractSteamIdentifier(profileInput.value);
    if (!identifier) {
      playerNote.value = '';
      noteStatus.textContent = '';
      return;
    }

    chrome.storage.local.remove(identifier, () => {
      playerNote.value = '';
      noteStatus.textContent = 'Удалено';
      setTimeout(() => {
        if (noteStatus.textContent === 'Удалено') {
          noteStatus.textContent = '';
        }
      }, 2000);
    });
  });
});
