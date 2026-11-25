const http = require('http');

const sessionPlayers = new Map();
let lastMapName = '';
let lastMapObj = null;

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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
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
