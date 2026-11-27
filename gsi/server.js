const http = require('http');
const https = require('https');

const sessionPlayers = new Map();
let lastMapName = '';
let lastMapObj = null;

// ─── /player-info cache & dedup ───────────────────────────────────────────────
const playerInfoCache = new Map();   // steamid → { data, cachedAt }
const playerInfoPending = new Map(); // steamid → Promise<data>
const PLAYER_INFO_TTL = 15 * 60 * 1000; // 15 min

/**
 * Extract the text content of the first XML tag with the given name.
 * Works without any external XML parser.
 */
function extractXmlTag(xml, tag) {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const s = xml.indexOf(open);
  if (s === -1) return null;
  const e = xml.indexOf(close, s);
  if (e === -1) return null;
  // Strip CDATA if present
  let val = xml.slice(s + open.length, e);
  val = val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
  return val || null;
}

/**
 * Fetch a URL with a timeout (ms).  Returns the full response body string.
 */
function httpsGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'CS2ProfileChecker/1.0 (node.js)',
        'Accept': 'text/xml,application/xml,text/plain;q=0.9'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Steam HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve(body));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

/**
 * Fetch and parse Steam profile XML for one steamid64.
 * Caches results in playerInfoCache; deduplicates concurrent requests via
 * playerInfoPending.
 */
async function fetchPlayerInfo(steamid) {
  // 1. Cache hit
  const cached = playerInfoCache.get(steamid);
  if (cached && Date.now() - cached.cachedAt < PLAYER_INFO_TTL) {
    return cached.data;
  }

  // 2. Already in-flight → reuse the same promise
  if (playerInfoPending.has(steamid)) {
    return playerInfoPending.get(steamid);
  }

  // 3. Fire request
  const promise = (async () => {
    try {
      const xml = await httpsGet(
        `https://steamcommunity.com/profiles/${steamid}/?xml=1`,
        4000
      );

      const privacyState  = extractXmlTag(xml, 'privacyState')   || 'unknown';
      const vacBanned     = parseInt(extractXmlTag(xml, 'vacBanned') || '0', 10);
      const tradeBanState = extractXmlTag(xml, 'tradeBanState')   || 'None';
      const memberSince   = extractXmlTag(xml, 'memberSince')     || null;

      // Parse CS2 hours from <mostPlayedGames> block
      let cs2Hours = null;
      const gamesBlockMatch = xml.match(/<mostPlayedGames>([\s\S]*?)<\/mostPlayedGames>/);
      if (gamesBlockMatch) {
        const gamesBlock = gamesBlockMatch[1];
        // Split into individual <mostPlayedGame> entries
        const gameEntries = gamesBlock.match(/<mostPlayedGame>[\s\S]*?<\/mostPlayedGame>/g) || [];
        for (const entry of gameEntries) {
          // Check for CS2 appid (730) or gameLink containing /730
          const gameLink = extractXmlTag(entry, 'gameLink') || '';
          const appid    = extractXmlTag(entry, 'appID')    || '';
          if (appid === '730' || gameLink.includes('/730')) {
            const hours = extractXmlTag(entry, 'hoursOnRecord');
            if (hours) {
              // "1,240" or "240.5" → keep as string, normalised
              cs2Hours = hours.replace(/,/g, '');
            }
            break;
          }
        }
      }

      const data = {
        ok: true,
        steamid,
        privacyState,
        vacBanned,
        tradeBanState,
        memberSince,
        cs2Hours,
        cachedAt: Date.now()
      };

      playerInfoCache.set(steamid, { data, cachedAt: Date.now() });
      return data;
    } catch (err) {
      const data = {
        ok: false,
        steamid,
        error: err.message,
        cachedAt: Date.now()
      };
      // Cache errors briefly (30 s) to avoid hammering on network issues
      playerInfoCache.set(steamid, { data, cachedAt: Date.now() - PLAYER_INFO_TTL + 30000 });
      return data;
    } finally {
      playerInfoPending.delete(steamid);
    }
  })();

  playerInfoPending.set(steamid, promise);
  return promise;
}

/**
 * Pre-warm the cache for a list of steamids (fire-and-forget).
 */
function prewarmPlayerInfo(steamids) {
  for (const sid of steamids) {
    if (!sid || sid === 'observer') continue;
    const cached = playerInfoCache.get(sid);
    if (cached && Date.now() - cached.cachedAt < PLAYER_INFO_TTL) continue;
    if (playerInfoPending.has(sid)) continue;
    fetchPlayerInfo(sid).catch(() => {}); // intentionally fire-and-forget
  }
}
// ─────────────────────────────────────────────────────────────────────────────

let latestMatchState = {
  connected: false,
  map: null,
  round: null,
  players: [],
  rawKeys: []
};

let lastHeartbeat = Date.now();
let lastPacketTime = Date.now();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    if (Date.now() - lastHeartbeat > 45000) {
      latestMatchState.connected = false;
    }
    if (Date.now() - lastPacketTime > 60000) {
      sessionPlayers.clear();
      latestMatchState.players = [];
      latestMatchState.map = null;
      latestMatchState.round = null;
      lastMapName = '';
      lastMapObj = null;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestMatchState));
    return;
  }

  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        lastHeartbeat = Date.now();
        lastPacketTime = Date.now();
        latestMatchState.connected = true;
        latestMatchState.rawKeys = Object.keys(data);

        console.log("Получен пакет от CS2. Ключи:", Object.keys(data));

        let currentMapName = data.map?.name || data.provider?.map || null;
        if (currentMapName && currentMapName !== lastMapName) {
          sessionPlayers.clear();
          lastMapName = currentMapName;
        }

        // Выход в главное меню CS2: есть data.provider, но нет data.map и data.round
        if (data.provider && !data.map && !data.round) {
          sessionPlayers.clear();
          lastMapObj = null;
          lastMapName = '';
          latestMatchState.map = null;
          latestMatchState.round = null;
        }

        if (data.map) {
          lastMapObj = {
            name: data.map.name || (lastMapObj ? lastMapObj.name : null),
            mode: data.map.mode || (lastMapObj ? lastMapObj.mode : null),
            phase: data.map.phase || (lastMapObj ? lastMapObj.phase : null),
            score_ct: data.map.team_ct?.score ?? (lastMapObj ? lastMapObj.score_ct : 0),
            score_t: data.map.team_t?.score ?? (lastMapObj ? lastMapObj.score_t : 0)
          };
          latestMatchState.map = lastMapObj;
        } else if (lastMapObj) {
          latestMatchState.map = lastMapObj;
        } else if (data.provider?.map) {
          lastMapObj = {
            name: data.provider.map,
            mode: data.provider.mode || 'unknown',
            phase: 'live',
            score_ct: 0,
            score_t: 0
          };
          latestMatchState.map = lastMapObj;
        }

        if (data.round) {
          latestMatchState.round = {
            phase: data.round.phase
          };
        }

        if (data.allplayers) {
          console.log("ALLPLAYERS ARMOR LOG:", Object.values(data.allplayers).map(p => `${p.name}: armor=${p.state?.armor}, helmet=${p.state?.helmet}`));
          Object.entries(data.allplayers).forEach(([steamid, playerData]) => {
            if (steamid && steamid !== 'observer') {
              const existing = sessionPlayers.get(steamid) || {};
              const pState = playerData.state || {};
              const armor = typeof pState.armor === 'number' ? pState.armor : (playerData.armor ?? existing.armor ?? 0);
              const helmet = Boolean(pState.helmet ?? playerData.helmet ?? existing.helmet);
              const pStats = playerData.match_stats || {};

              sessionPlayers.set(steamid, {
                steamid: steamid,
                steamId: steamid,
                name: playerData.name || existing.name || 'Unknown',
                team: playerData.team || existing.team || 'CT',
                hp: pState.health ?? existing.hp ?? 100,
                money: pState.money ?? existing.money ?? 0,
                armor: armor,
                helmet: helmet,
                kills: pStats.kills ?? existing.kills ?? 0,
                deaths: pStats.deaths ?? existing.deaths ?? 0,
                assists: pStats.assists ?? existing.assists ?? 0
              });
            }
          });
        }

        if (data.player && data.player.steamid) {
          const localSteamId = data.player.steamid;
          const existing = sessionPlayers.get(localSteamId) || {};
          const pState = data.player.state || {};
          const armor = typeof pState.armor === 'number' ? pState.armor : (data.player.armor ?? existing.armor ?? 0);
          const helmet = Boolean(pState.helmet ?? data.player.helmet ?? existing.helmet);
          const pStats = data.player.match_stats || {};

          sessionPlayers.set(localSteamId, {
            steamid: localSteamId,
            steamId: localSteamId,
            name: data.player.name || existing.name || 'You',
            team: data.player.team || existing.team || 'unknown',
            hp: pState.health ?? existing.hp ?? 100,
            money: pState.money ?? existing.money ?? 0,
            armor: armor,
            helmet: helmet,
            kills: pStats.kills ?? existing.kills ?? 0,
            deaths: pStats.deaths ?? existing.deaths ?? 0,
            assists: pStats.assists ?? existing.assists ?? 0
          });
        }

        latestMatchState.players = Array.from(sessionPlayers.values());

        // Background pre-warm /player-info cache for all session players
        prewarmPlayerInfo(Array.from(sessionPlayers.keys()));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // GET /player-info?steamid=<STEAMID64>
  if (req.method === 'GET' && req.url.startsWith('/player-info')) {
    const urlObj = new URL(req.url, 'http://127.0.0.1');
    const steamid = urlObj.searchParams.get('steamid') || '';

    if (!/^\d{17}$/.test(steamid)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid steamid' }));
      return;
    }

    fetchPlayerInfo(steamid).then(data => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`CS2 GSI Server running at http://127.0.0.1:${PORT}`);
});
