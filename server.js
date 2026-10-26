const http = require('http');
const port = process.env.PORT || 3000;

// Маскируем все запросы под обычный браузер
if (global.fetch) {
  const originalFetch = global.fetch;
  global.fetch = (url, opts = {}) => {
    opts = opts || {};
    opts.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...opts.headers,
    };
    return originalFetch(url, opts);
  };
}

const server = http.createServer(async (req, res) => {
  // Эмуляция Express/Vercel
  res.status = function (statusCode) {
    res.statusCode = statusCode;
    return res;
  };

  res.send = function (body) {
    if (typeof body === 'object' && !Buffer.isBuffer(body)) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    } else {
      res.end(body);
    }
    return res;
  };

  res.json = function (jsonBody) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(jsonBody));
    return res;
  };

  try {
    const handlerModule = await import('./api/index.js');
    const handler = handlerModule.default || handlerModule;

    if (typeof handler === 'function') {
      await handler(req, res);
    } else {
      res.status(200).send('Server is live');
    }
  } catch (err) {
    console.error('CRITICAL HANDLER ERROR:', err);
    res.status(500).send('Handler Error: ' + err.stack || err.message);
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
