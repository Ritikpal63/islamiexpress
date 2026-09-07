const { test, afterEach } = require('node:test');
const { mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('next/dist/build/swc');
const { NextRequest } = require('next/server');
const { safeReturnPath } = require('../apps/web/lib/auth.mjs');
const { getApiUrl } = require('../apps/web/lib/api-config.mjs');
let invalidations = 0;

function compile(file) {
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' }, module: { type: 'commonjs' },
  }).code;
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@/lib/api-config.mjs' || name === './api-config.mjs') return { getApiUrl };
    if (name === 'next/cache') return { revalidatePath: () => { invalidations++; } };
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const routes = compile(path.resolve('apps/web/app/api/[...path]/route.js'));
const { clientApi } = compile(path.resolve('apps/web/lib/api.js'));
const env = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  delete global.window;
  for (const key of ['API_URL', 'NEXT_PUBLIC_API_URL', 'VERCEL']) {
    if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
  }
  invalidations = 0;
});
function request(endpoint, { method = 'GET', token, origin, body } = {}) {
  process.env.API_URL = 'https://backend.example.test/api/';
  const headers = {};
  if (token) headers.cookie = `ie_session=${token}`;
  if (origin) headers.origin = origin;
  if (body) headers['content-type'] = 'application/json';
  const req = new NextRequest(`https://news.example.test/api/${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return routes[method](req, { params: Promise.resolve({ path: endpoint.split('/') }) });
}

test('login stores an HttpOnly secure cookie and does not expose the token to JavaScript', async () => {
  mock.method(global, 'fetch', async () => Response.json({ success: true, token: 'signed-token', user: { id: 'reader-1', role: 'reader' } }));
  const response = await request('auth/login', { method: 'POST', origin: 'https://news.example.test', body: { email: 'reader@example.test', password: 'password-test' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).token, undefined);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /ie_session=signed-token/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=lax/i);
});

test('comment request forwards the stored login session to the same backend', async () => {
  mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://backend.example.test/api/comments/article/article-1');
    assert.equal(options.headers.get('authorization'), 'Bearer signed-token');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(JSON.parse(options.body), { body: 'Test comment' });
    return Response.json({ success: true, data: { status: 'pending' } }, { status: 201 });
  });
  const response = await request('comments/article/article-1', { method: 'POST', token: 'signed-token', origin: 'https://news.example.test', body: { body: 'Test comment' } });
  assert.equal(response.status, 201);
});

test('cross-origin authenticated writes are rejected before contacting the backend', async () => {
  const fetch = mock.method(global, 'fetch', async () => { throw new Error('Must not fetch'); });
  assert.equal((await request('articles', { method: 'POST', token: 'token', origin: 'https://attacker.example', body: {} })).status, 403);
  assert.equal(fetch.mock.callCount(), 0);
});

test('expired sessions clear their cookie; backend outages do not masquerade as login failures', async () => {
  const fetch = mock.method(global, 'fetch', async () => Response.json({ message: 'Invalid or expired token' }, { status: 401 }));
  const expired = await request('auth/me', { token: 'expired' });
  assert.equal(expired.status, 401);
  assert.match(expired.headers.get('set-cookie'), /Max-Age=0/);
  fetch.mock.mockImplementation(async () => { throw new Error('Network unavailable'); });
  const outage = await request('auth/me', { token: 'valid' });
  assert.equal(outage.status, 502);
  assert.equal(outage.headers.get('set-cookie'), null);
});

test('logout clears the cookie without depending on backend availability', async () => {
  const fetch = mock.method(global, 'fetch', async () => { throw new Error('Unavailable'); });
  const response = await request('auth/logout', { method: 'POST', token: 'token', origin: 'https://news.example.test' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('successful publishing invalidates public pages, failed writes do not', async () => {
  const fetch = mock.method(global, 'fetch', async () => Response.json({ success: true, data: { status: 'published' } }, { status: 201 }));
  await request('articles', { method: 'POST', token: 'admin-token', body: { title: 'Story' } });
  assert.equal(invalidations, 1);
  fetch.mock.mockImplementation(async () => Response.json({ message: 'Choose an active category' }, { status: 400 }));
  await request('articles', { method: 'POST', token: 'admin-token', body: {} });
  assert.equal(invalidations, 1);
});

test('return paths stay within the site and preserve the article comment anchor', () => {
  assert.equal(safeReturnPath('/article/story?edition=hi#comments'), '/article/story?edition=hi#comments');
  for (const url of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/\nevil']) assert.equal(safeReturnPath(url), '/');
});

test('Vercel rejects localhost API configuration and accepts the public HTTPS backend', () => {
  process.env.VERCEL = '1';
  process.env.API_URL = 'http://localhost:8000/api';
  assert.throws(getApiUrl, /deployed HTTPS/);
  process.env.API_URL = 'https://backend.example.test/api/';
  assert.equal(getApiUrl(), 'https://backend.example.test/api');
});

test('client sends same-origin cookies even when localStorage is blocked', async () => {
  global.window = { get localStorage() { throw new Error('Storage blocked'); } };
  mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, '/api/comments/article/story');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.headers.get('authorization'), null);
    return Response.json({ success: true });
  });
  await clientApi('/comments/article/story', { method: 'POST', body: JSON.stringify({ body: 'Hello' }) });
});

test('client preserves HTTP status codes for authentication versus service errors', async () => {
  global.window = { localStorage: { getItem: () => null } };
  const fetch = mock.method(global, 'fetch', async () => Response.json({ message: 'Expired' }, { status: 401 }));
  await assert.rejects(clientApi('/auth/me'), { status: 401 });
  fetch.mock.mockImplementation(async () => Response.json({ message: 'Unavailable' }, { status: 503 }));
  await assert.rejects(clientApi('/auth/me'), { status: 503 });
});

test('same-origin writes work when NextURL normalizes a loopback host', async () => {
  process.env.API_URL = 'http://127.0.0.1:8000/api';
  mock.method(global, 'fetch', async () => Response.json({ success: true }));
  const req = new NextRequest('http://localhost:3219/api/comments/article/story', {
    method: 'POST', headers: { host: '127.0.0.1:3219', origin: 'http://127.0.0.1:3219', 'content-type': 'application/json' }, body: JSON.stringify({ body: 'Comment' }),
  });
  const response = await routes.POST(req, { params: Promise.resolve({ path: ['comments', 'article', 'story'] }) });
  assert.equal(response.status, 200);
});
