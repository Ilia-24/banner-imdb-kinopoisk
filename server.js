import http from 'http';
import handler from './api/index.js';

const server = http.createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error: ' + err.message);
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
