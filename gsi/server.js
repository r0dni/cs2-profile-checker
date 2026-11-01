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
    // 45 seconds timeout for connection status
    if (Date.now() - lastHeartbeat > 45000) {
      latestMatchState.connected = false;
    }
    if (Date.now() - lastPacketTime > 5000) {
      sessionPlayers.clear();
      latestMatchState.players = [];
      latestMatchState.map = null;
      latestMatchState.round = null;
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
        if (data.allplayers) {
          console.log("ALLPLAYERS ARMOR LOG:", Object.values(data.allplayers).map(p => `${p.name}: armor=${p.state?.armor}, helmet=${p.state?.helmet}`));
          sessionPlayers.clear();
          Object.entries(data.allplayers).forEach(([steamid, playerData]) => {
            if (steamid && steamid !== 'observer') {
              const pState = playerData.state || {};
              const armor = typeof pState.armor === 'number' ? pState.armor : 0;
              const helmet = Boolean(pState.helmet);
              const pStats = playerData.match_stats || {};
              sessionPlayers.set(steamid, {
                steamid: steamid,
                steamId: steamid,
                name: playerData.name || 'Unknown',
                team: playerData.team || 'CT',
                hp: pState.health ?? 100,
                money: pState.money ?? 0,
                armor: armor,
                helmet: helmet,
                kills: pStats.kills ?? 0,
                deaths: pStats.deaths ?? 0,
                assists: pStats.assists ?? 0
              });
            }
          });
        }

        if (data.player && data.player.steamid) {
          const localSteamId = data.player.steamid;
          const pState = data.player.state || {};
          const armor = typeof pState.armor === 'number' ? pState.armor : 0;
          const helmet = Boolean(pState.helmet);
          const pStats = data.player.match_stats || {};
          const localPlayerObj = {
            steamid: localSteamId,
            steamId: localSteamId,
            name: data.player.name || 'You',
            team: data.player.team || 'unknown',
            hp: pState.health ?? 100,
            money: pState.money ?? 0,
            armor: armor,
            helmet: helmet,
            kills: pStats.kills ?? 0,
            deaths: pStats.deaths ?? 0,
            assists: pStats.assists ?? 0
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
              armor: armor,
              helmet: helmet,
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
