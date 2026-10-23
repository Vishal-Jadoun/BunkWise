import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';
import https from 'https';
import zlib from 'zlib';

function executeWarmup(warmupUrl: string, warmupBody: string): Promise<string[]> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(warmupUrl);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;
      const bodyBuf = Buffer.from(warmupBody);

      const req = transport.request(
        warmupUrl,
        {
          method: 'POST',
          headers: {
            'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G960F)',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'gzip',
            'Content-Length': bodyBuf.length,
          },
        },
        (res) => {
          const rawCookies = res.headers['set-cookie'] || [];
          const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
          res.resume();
          res.on('end', () => {
            resolve(cookies.map(c => c.split(';')[0]));
          });
        }
      );

      req.on('error', (err) => {
        console.warn('Warmup request warning:', err.message);
        resolve([]);
      });

      if (bodyBuf.length > 0) req.write(bodyBuf);
      req.end();
    } catch (e: any) {
      console.warn('Warmup execution error:', e.message);
      resolve([]);
    }
  });
}

function schoolPadLocalProxy(): Plugin {
  return {
    name: 'schoolpad-local-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Warmup-Url, X-Warmup-Body');
            res.end();
            return;
          }

          const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
          const targetUrl = reqUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing target url parameter' }));
            return;
          }

          // Security: Enforce strict hostname allowlist to prevent SSRF and open proxy abuse
          try {
            const parsedTarget = new URL(targetUrl);
            if (parsedTarget.protocol !== 'https:' && parsedTarget.protocol !== 'http:') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Only http and https protocols are supported' }));
              return;
            }
            if (parsedTarget.port && parsedTarget.port !== '443' && parsedTarget.port !== '80') {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Non-standard port rejected' }));
              return;
            }
            const host = parsedTarget.hostname.toLowerCase();
            const isPermitted =
              host === 'cuiet.codebrigade.in' ||
              host.endsWith('.codebrigade.in') ||
              host === 'gdemo.schoolpad.in' ||
              host.endsWith('.schoolpad.in') ||
              host === 's3.amazonaws.com' ||
              host.endsWith('.amazonaws.com');

            if (!isPermitted) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Destination host not permitted by proxy policy' }));
              return;
            }
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Malformed target URL' }));
            return;
          }

          // Check for Warmup request headers
          const warmupHeaderUrl = req.headers['x-warmup-url'] as string | undefined;
          const warmupHeaderBody = req.headers['x-warmup-body'] as string | undefined;

          let sessionCookies: string[] = [];
          if (warmupHeaderUrl) {
            try {
              const decodedUrl = decodeURIComponent(warmupHeaderUrl);
              const parsedWarmup = new URL(decodedUrl);
              const warmupHost = parsedWarmup.hostname.toLowerCase();
              if (warmupHost.endsWith('.codebrigade.in') || warmupHost.endsWith('.schoolpad.in')) {
                const decodedBody = warmupHeaderBody ? decodeURIComponent(warmupHeaderBody) : '';
                sessionCookies = await executeWarmup(decodedUrl, decodedBody);
              }
            } catch (err: any) {
              console.warn('Could not decode warmup headers:', err.message);
            }
          }

          // Buffer request body
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const bodyBuffer = Buffer.concat(chunks);

          const parsedTarget = new URL(targetUrl);
          const isHttps = parsedTarget.protocol === 'https:';
          const transport = isHttps ? https : http;

          const requestHeaders: Record<string, string | number> = {
            'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G960F)',
            'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
            'Accept': '*/*',
            'Content-Length': bodyBuffer.length,
          };

          if (sessionCookies.length > 0) {
            requestHeaders['Cookie'] = sessionCookies.join('; ');
          }

          const proxyReq = transport.request(
            targetUrl,
            {
              method: req.method,
              headers: requestHeaders,
            },
            (proxyRes) => {
              res.statusCode = proxyRes.statusCode || 200;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Warmup-Url, X-Warmup-Body');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
              res.setHeader('Pragma', 'no-cache');

              const encoding = proxyRes.headers['content-encoding'];
              let stream: NodeJS.ReadableStream = proxyRes;

              if (encoding === 'gzip') {
                stream = proxyRes.pipe(zlib.createGunzip());
              } else if (encoding === 'deflate') {
                stream = proxyRes.pipe(zlib.createInflate());
              }

              res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json; charset=utf-8');
              stream.pipe(res);
            }
          );

          proxyReq.on('error', (err) => {
            console.error('Proxy request error:', err.message);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Proxy request failed', details: err.message }));
          });

          if (bodyBuffer.length > 0) {
            proxyReq.write(bodyBuffer);
          }
          proxyReq.end();
        } catch (err: any) {
          console.error('Proxy handler error:', err.message);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal proxy error', details: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), schoolPadLocalProxy()],
  server: {
    host: true,
    port: 5173,
  },
});
