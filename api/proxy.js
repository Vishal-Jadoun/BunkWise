// api/proxy.js - Vercel Serverless Function proxy for university ERP requests
import http from 'http';
import https from 'https';
import zlib from 'zlib';

function executeWarmup(warmupUrl, warmupBody) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(warmupUrl);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;
      const bodyBuf = Buffer.from(warmupBody || '');

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
            resolve(cookies.map((c) => c.split(';')[0]));
          });
        }
      );

      req.on('error', () => resolve([]));
      if (bodyBuf.length > 0) req.write(bodyBuf);
      req.end();
    } catch {
      resolve([]);
    }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Warmup-Url, X-Warmup-Body');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target url parameter' });
  }

  // Security: Enforce strict hostname allowlist to prevent SSRF and open proxy abuse
  try {
    const parsedTarget = new URL(targetUrl);
    const host = parsedTarget.hostname.toLowerCase();
    const isPermitted =
      host === 'cuiet.codebrigade.in' ||
      host.endsWith('.codebrigade.in') ||
      host === 'gdemo.schoolpad.in' ||
      host.endsWith('.schoolpad.in') ||
      host === 's3.amazonaws.com' ||
      host.endsWith('.amazonaws.com');

    if (!isPermitted) {
      return res.status(403).json({ error: 'Destination host not permitted by proxy security policy' });
    }
  } catch {
    return res.status(400).json({ error: 'Malformed target URL' });
  }

  const warmupHeaderUrl = req.headers['x-warmup-url'];
  const warmupHeaderBody = req.headers['x-warmup-body'];
  let sessionCookies = [];

  if (warmupHeaderUrl) {
    try {
      const decodedUrl = decodeURIComponent(warmupHeaderUrl);
      const parsedWarmup = new URL(decodedUrl);
      const warmupHost = parsedWarmup.hostname.toLowerCase();
      if (warmupHost.endsWith('.codebrigade.in') || warmupHost.endsWith('.schoolpad.in')) {
        const decodedBody = warmupHeaderBody ? decodeURIComponent(warmupHeaderBody) : '';
        sessionCookies = await executeWarmup(decodedUrl, decodedBody);
      }
    } catch {}
  }

  // Collect request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const bodyBuffer = Buffer.concat(chunks);

  const parsedTarget = new URL(targetUrl);
  const isHttps = parsedTarget.protocol === 'https:';
  const transport = isHttps ? https : http;

  const requestHeaders = {
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
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json; charset=utf-8');

      const encoding = proxyRes.headers['content-encoding'];
      let stream = proxyRes;

      if (encoding === 'gzip') {
        stream = proxyRes.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        stream = proxyRes.pipe(zlib.createInflate());
      }

      stream.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.status(502).json({ error: 'Proxy request failed', details: err.message });
  });

  if (bodyBuffer.length > 0) {
    proxyReq.write(bodyBuffer);
  }
  proxyReq.end();
}
