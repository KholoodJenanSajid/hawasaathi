import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { executeExplain } from './api/_shared';

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          const geminiConfigured = Boolean(
            process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
          );
          res.statusCode = 200;
          res.end(JSON.stringify({ geminiConfigured }));
          return;
        }

        if (url === '/api/explain' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const parsed = bodyStr ? JSON.parse(bodyStr) : {};
              const result = await executeExplain(parsed, req.socket.remoteAddress || 'localhost');
              res.statusCode = result.status;
              res.end(JSON.stringify(result.body));
            } catch (err) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  error: 'Internal server error in dev API',
                  details: err instanceof Error ? err.message : String(err),
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiDevServerPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
