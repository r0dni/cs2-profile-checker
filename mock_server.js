const http = require('http');
const fs = require('fs');
const path = require('path');

const mockChrome = `<script>
  window.chrome = {
    storage: {
      sync: {
        get: function(keys, cb) { if (cb) cb({}); },
        set: function(items, cb) { if (cb) cb(); }
      },
      local: {
        get: function(keys, cb) { if (cb) cb({}); },
        set: function(items, cb) { if (cb) cb(); }
      }
    },
    runtime: {
      lastError: null
    },
    tabs: {
      query: function(opts, cb) { if (cb) cb([]); }
    }
  };
</script>`;

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];
  const relativePath = cleanUrl === '/' ? 'popup.html' : cleanUrl.replace(/^\//, '');
  const filePath = path.join(__dirname, relativePath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace('<head>', '<head>' + mockChrome);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
    return;
  }

  if (filePath.endsWith('.js')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  if (filePath.endsWith('.css')) {
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(200);
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8081, '127.0.0.1', () => {
  console.log('Mock server listening on http://127.0.0.1:8081');
});
