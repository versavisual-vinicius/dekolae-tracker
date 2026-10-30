import http from 'node:http';
import fs from 'node:fs';
import { URL } from 'node:url';
import { createServer as createViteServer } from 'vite';
import handler from './api/event-data.js';

// Load .env
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const idx = line.indexOf('=');
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  });
}

async function start() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    if (parsedUrl.pathname.startsWith('/api/event-data')) {
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());
      
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };

      try {
        await handler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    vite.middlewares(req, res);
  });

  const PORT = process.env.PORT || 3005;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Dekolaê Sunset Tracker rodando em http://localhost:${PORT}`);
    console.log(`📡 API local em http://localhost:${PORT}/api/event-data\n`);
  });
}

start();
