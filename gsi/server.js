const http = require('http');

const sessionPlayers = new Map();
let lastMapName = '';

let latestMatchState = {
  connected: false,
  map: null,
  round: null,
  players: [],
  rawKeys: []
};

let lastHeartbeat = Date.now();

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
    // 45 seconds timeout for connection status
    if (Date.now() - lastHeartbeat > 45000) {
      latestMatchState.connected = false;
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
        latestMatchState.connected = true;
        latestMatchState.rawKeys = Object.keys(data);

        console.log("Получен пакет от CS2. Ключи:", Object.keys(data));
        if (data.allplayers) {
          console.log("allplayers keys:", Object.keys(data.allplayers || {}));
          const firstKey = Object.keys(data.allplayers)[0];
          if (firstKey) {
            console.log("Sample player data:", data.allplayers[firstKey]);
          }
        }

        if (data.map) {
          if (data.map.name && data.map.name !== lastMapName) {
            sessionPlayers.clear();
            lastMapName = data.map.name;
          }
          latestMatchState.map = {
            name: data.map.name,
            mode: data.map.mode,
            phase: data.map.phase,
            score_ct: data.map.team_ct?.score || 0,
            score_t: data.map.team_t?.score || 0
          };
        }

        if (data.round) {
          latestMatchState.round = {
            phase: data.round.phase
          };
        }

        const playersMap = data.allplayers || data.allplayers_id || {};
        if (data.allplayers) {
          sessionPlayers.clear();
          Object.entries(data.allplayers).forEach(([steamid, playerData]) => {
            if (steamid && steamid !== 'observer') {
              sessionPlayers.set(steamid, {
                steamid: steamid,
                steamId: steamid,
                name: playerData.name || 'Unknown',
                team: playerData.team || 'CT',
                hp: playerData.state?.health ?? 100,
                money: playerData.state?.money ?? 0,
                kills: playerData.match_stats?.kills ?? 0,
                deaths: playerData.match_stats?.deaths ?? 0,
                assists: playerData.match_stats?.assists ?? 0
              });
            }
          });
        }

        if (data.player && data.player.steamid) {
          const localSteamId = data.player.steamid;
          const pState = data.player.state || {};
          const pStats = data.player.match_stats || {};
          const localPlayerObj = {
            steamid: localSteamId,
            steamId: localSteamId,
            name: data.player.name || 'You',
            team: data.player.team || 'unknown',
            hp: pState.health ?? 100,
            money: pState.money ?? 0,
            kills: pStats.kills ?? 0,
            deaths: pStats.deaths ?? 0,
            assists: pStats.assists ?? 0,
            armor: data.player.state?.armor ?? (data.player.armor ?? 0),
            helmet: data.player.state?.helmet ?? (data.player.helmet ?? false),
                armor: pInfo.state?.armor ?? (pInfo.armor ?? 0),
                helmet: pInfo.state?.helmet ?? (pInfo.helmet ?? false)
          };
          if (!sessionPlayers.has(localSteamId)) {
            sessionPlayers.set(localSteamId, localPlayerObj);
          } else {
            const existing = sessionPlayers.get(localSteamId);
            sessionPlayers.set(localSteamId, {
              ...existing,
              team: data.player.team || existing.team,
              name: data.player.name || existing.name,
              hp: pState.health ?? existing.hp,
              money: pState.money ?? existing.money,
              kills: pStats.kills ?? existing.kills,
              deaths: pStats.deaths ?? existing.deaths,
              assists: pStats.assists ?? existing.assists
            });
          }
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
