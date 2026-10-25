import http from 'http';
import handler from './api/index.js';

const server = http.createServer(async (req, res) => {
  try {
    // Преобразуем прямые запросы вида /tt9733388.png в формат query-параметров, который ожидает api/index.js
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname !== '/' && !url.searchParams.has('id')) {
      const cleanPath = pathname.replace(/^\//, '');
      req.url = `/?id=${cleanPath}`;
    }

    await handler(req, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
