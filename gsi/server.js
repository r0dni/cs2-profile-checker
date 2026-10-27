const http = require('http');

let latestMatchState = {
  connected: false,
  map: null,
  round: null,
  players: []
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
    if (Date.now() - lastHeartbeat > 10000) {
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

        if (data.map) {
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

        if (data.allplayers) {
          const players = [];
          for (const [steamId, pInfo] of Object.entries(data.allplayers)) {
            players.push({
              steamId: steamId,
              name: pInfo.name || 'Unknown',
              team: pInfo.team || 'unknown',
              observer_slot: pInfo.observer_slot || 0,
              stats: pInfo.match_stats || {}
            });
          }
          latestMatchState.players = players;
        }

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
