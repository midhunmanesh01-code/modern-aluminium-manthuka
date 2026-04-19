const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'midhun123';
const SESSION_COOKIE = 'admin_session';
const SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN || 'admin-session-midhun';
const FRONTEND_ORIGINS = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim().toLowerCase())
  .filter(Boolean);
const API_HOSTNAME = String(process.env.API_HOSTNAME || '').trim().toLowerCase();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

async function ensureStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MESSAGES_FILE)) {
    await fsp.writeFile(MESSAGES_FILE, '[]', 'utf8');
  }
}

async function readMessages() {
  try {
    const raw = await fsp.readFile(MESSAGES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMessages(messages) {
  await fsp.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const out = {};
  cookieHeader.split(';').forEach(part => {
    const item = part.trim();
    if (!item) return;
    const eq = item.indexOf('=');
    if (eq < 0) return;
    const key = item.slice(0, eq).trim();
    const value = item.slice(eq + 1).trim();
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] === SESSION_TOKEN;
}

function isSecureRequest(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (forwardedProto.includes('https')) return true;
  const host = String(req.headers.host || '').toLowerCase();
  return !host.startsWith('localhost') && !host.startsWith('127.0.0.1');
}

function setAdminCookie(req, res) {
  const secure = isSecureRequest(req);
  const secureFlag = secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(SESSION_TOKEN)}; HttpOnly; Path=/; SameSite=Lax${secureFlag}`);
}

function clearAdminCookie(req, res) {
  const secure = isSecureRequest(req);
  const secureFlag = secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`);
}

function normalizePath(urlPath) {
  if (!urlPath || urlPath === '/') return '/index.html';
  return urlPath;
}

function getRequestHostname(req) {
  return String(req.headers.host || '').split(':')[0].toLowerCase();
}

function isApiHostRequest(req) {
  const host = getRequestHostname(req);
  if (!host) return false;
  if (API_HOSTNAME && host === API_HOSTNAME) return true;
  return host.startsWith('api.');
}

function buildOriginVariants(origin) {
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    const hostWithoutWww = host.startsWith('www.') ? host.slice(4) : host;
    const hostWithWww = host.startsWith('www.') ? host : `www.${host}`;
    const port = url.port ? `:${url.port}` : '';
    return [
      `${url.protocol}//${hostWithoutWww}${port}`,
      `${url.protocol}//${hostWithWww}${port}`
    ];
  } catch {
    return [String(origin || '').toLowerCase()];
  }
}

function isAllowedOrigin(origin) {
  const normalizedOrigin = String(origin || '').trim().toLowerCase();
  if (!normalizedOrigin) return false;

  if (/^https:\/\/(www\.)?aluminiumfabricationpandalam\.in$/i.test(normalizedOrigin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;

  for (const configuredOrigin of FRONTEND_ORIGINS) {
    const variants = buildOriginVariants(configuredOrigin);
    if (variants.includes(normalizedOrigin)) return true;
  }

  return false;
}

function applyCors(req, res) {
  const origin = String(req.headers.origin || '');
  if (!origin || !isAllowedOrigin(origin)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = normalizePath(url.pathname);

  // For API domains (for example api.example.com), avoid serving website HTML.
  if (isApiHostRequest(req)) {
    const isAdminRoute =
      pathname === '/admin' ||
      pathname === '/admin.html' ||
      pathname === '/admin-login' ||
      pathname === '/config.js';

    if (isAdminRoute) {
      // Allow admin pages and config on API host.
    } else if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(302, { Location: '/admin-login' });
      res.end();
      return;
    } else {
      return sendJson(res, 404, {
        error: 'Not found. Use /api/* routes on this domain.'
      });
    }
  }

  if ((pathname === '/admin' || pathname === '/admin.html') && !isAdminAuthenticated(req)) {
    res.writeHead(302, { Location: '/admin-login' });
    res.end();
    return;
  }

  if (pathname === '/admin') {
    pathname = '/admin.html';
  }

  // Never serve message storage files directly from the web.
  if (pathname === '/data' || pathname.startsWith('/data/')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const safePath = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(ROOT, safePath);

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await fsp.readFile(filePath);
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch {
    try {
      const data = await fsp.readFile(path.join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      sendJson(res, 404, { error: 'Not found' });
    }
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/messages') {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }
    const messages = await readMessages();
    const ordered = [...messages].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    return sendJson(res, 200, { messages: ordered.slice(0, 100) });
  }

  const messageDeleteMatch = /^\/api\/messages\/(\d+)\/?$/.exec(url.pathname);
  if (req.method === 'DELETE' && messageDeleteMatch) {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const id = Number(messageDeleteMatch[1]);
    const messages = await readMessages();
    const filtered = messages.filter(item => Number(item.id) !== id);

    if (filtered.length === messages.length) {
      return sendJson(res, 404, { error: 'Message not found.' });
    }

    await writeMessages(filtered);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/messages/delete') {
    if (!isAdminAuthenticated(req)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');
      const id = Number(payload.id);

      if (!id) {
        return sendJson(res, 400, { error: 'Message id is required.' });
      }

      const messages = await readMessages();
      const filtered = messages.filter(item => Number(item.id) !== id);

      if (filtered.length === messages.length) {
        return sendJson(res, 404, { error: 'Message not found.' });
      }

      await writeMessages(filtered);
      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 400, { error: 'Invalid request body.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');
      const password = String(payload.password || '');

      if (password !== ADMIN_PASSWORD) {
        return sendJson(res, 401, { error: 'Invalid password.' });
      }

      setAdminCookie(req, res);
      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 400, { error: 'Invalid request body.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    clearAdminCookie(req, res);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/session') {
    return sendJson(res, 200, { authenticated: isAdminAuthenticated(req) });
  }

  if (req.method === 'POST' && url.pathname === '/api/contact') {
    try {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || '{}');

      const name = String(payload.name || '').trim();
      const phone = String(payload.phone || '').trim();
      const email = String(payload.email || '').trim();
      const service = String(payload.service || '').trim();
      const message = String(payload.message || '').trim();

      if (!name || !phone) {
        return sendJson(res, 400, { error: 'Name and phone number are required.' });
      }

      const messages = await readMessages();
      const nextId = messages.length ? Number(messages[0].id || 0) + 1 : 1;

      const newMessage = {
        id: nextId,
        name,
        phone,
        email,
        service,
        message,
        createdAt: new Date().toISOString()
      };

      messages.unshift(newMessage);
      await writeMessages(messages);

      return sendJson(res, 200, {
        message: 'Message sent successfully. We will get back to you soon.'
      });
    } catch {
      return sendJson(res, 400, { error: 'Invalid request body.' });
    }
  }

  return sendJson(res, 404, { error: 'API route not found.' });
}

async function start() {
  await ensureStore();

  const loginPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141414;color:#f7f7f7;font-family:Arial,sans-serif}
  .card{width:min(92vw,380px);background:#1f1f1f;padding:24px;border-radius:12px;border:1px solid #333}
  h1{font-size:1.3rem;margin:0 0 10px}
  p{color:#b5b5b5;font-size:.92rem;line-height:1.5}
  input,button{width:100%;padding:11px 12px;border-radius:8px;border:1px solid #444;font-size:.95rem}
  input{background:#121212;color:#fff;margin-top:12px}
  button{background:#c9a84c;color:#141414;font-weight:700;margin-top:10px;cursor:pointer}
  .error{display:none;color:#ffb4b4;background:#4f1f1f;border:1px solid #7a3030;padding:10px;border-radius:8px;margin-top:10px}
</style>
</head>
<body>
  <form class="card" id="loginForm">
    <h1>Admin Login</h1>
    <p>Enter your admin password to view website messages.</p>
    <input id="password" type="password" placeholder="Password" required>
    <button type="submit">Login</button>
    <div class="error" id="errorBox"></div>
  </form>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const errorBox = document.getElementById('errorBox');
      errorBox.style.display = 'none';
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed.');
        window.location.href = '/admin';
      } catch (error) {
        errorBox.textContent = error.message || 'Login failed.';
        errorBox.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname.startsWith('/api/')) {
        applyCors(req, res);
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
      }

      if (req.method === 'GET' && url.pathname === '/admin-login') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(loginPage);
        return;
      }
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res);
      } else {
        await serveStatic(req, res);
      }
    } catch (error) {
      console.error('Server error:', error);
      sendJson(res, 500, { error: 'Internal server error.' });
    }
  });

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
