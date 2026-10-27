function extractSteamIdentifier(input) {
  if (!input) return null;
  input = input.trim();
  if (!input) return null;

  // Check if it's a steamcommunity URL
  try {
    const url = new URL(input);
    if (url.hostname.includes('steamcommunity.com')) {
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
  const cstrackerBtn = document.getElementById('cstrackerBtn');
  const cs2trackerBtn = document.getElementById('cs2trackerBtn');

  // Automatically read from clipboard on load if applicable
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText) {
      const cleaned = clipboardText.trim();
      if (cleaned.includes('steamcommunity.com') || /^\d{17}$/.test(cleaned) || /^[a-zA-Z0-9_-]{3,}$/.test(cleaned)) {
        profileInput.value = cleaned;
      }
    }
  } catch (err) {
    // Clipboard permission or access denied, ignore silently
  }

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

  cstrackerBtn.addEventListener('click', () => {
    handleRedirect(id => `https://cstracker.gg/profile/steam/${id}`);
  });

  cs2trackerBtn.addEventListener('click', () => {
    handleRedirect(id => `https://cs2tracker.gg/profile/${id}`);
  });

  // Clear error on input change
  profileInput.addEventListener('input', () => {
    if (errorMsg && !errorMsg.classList.contains('hidden')) {
      errorMsg.classList.add('hidden');
      profileInput.classList.remove('error');
    }
  });
});
