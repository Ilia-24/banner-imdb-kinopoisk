import { createServer } from 'http';
import handler from './api/index.js';

const server = createServer(async (req, res) => {
  console.log('Incoming request:', req.url); // Теперь в Логах Render будет виден каждый запрос!
  try {
    await handler(req, res);
  } catch (err) {
    console.error('Server error handler:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Server Error: ' + err.message);
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
