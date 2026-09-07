const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const jwt = require('jsonwebtoken');
const pool = require('../apps/api/src/config/db');
const articleInput = require('../apps/api/src/utils/articleInput');
const { requireAuth } = require('../apps/api/src/middleware/auth');
const articleRoutes = require('../apps/api/src/routes/articles.routes');
const commentRoutes = require('../apps/api/src/routes/comments.routes');
const secret = 'test-only-secret-with-at-least-32-characters';
process.env.JWT_SECRET = secret;
afterEach(() => mock.restoreAll());

const user = { id: 'test-reader', name: 'Reader', email: 'reader@example.test', role: 'reader', status: 'active' };
const article = { title: 'A verified story', body: '<p>News report.</p>', category_id: '2', status: 'published' };
function invoke(handlers, request = {}) {
  return new Promise((resolve, reject) => {
    const req = { headers: {}, params: {}, body: {}, ...request };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ status: this.statusCode, data }); } };
    let index = 0;
    const next = error => {
      if (error) return resolve({ status: error.status || 500, data: { message: error.message } });
      if (!handlers[index]) return resolve({ status: res.statusCode, user: req.user });
      try { Promise.resolve(handlers[index++](req, res, next)).catch(reject); } catch (error) { reject(error); }
    };
    next();
  });
}
function handlers(router, method, path) {
  return router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack.map(layer => layer.handle);
}
function auth(role = 'reader', expiresIn = '1h') {
  return { authorization: `Bearer ${jwt.sign({ id: user.id, role }, secret, { expiresIn })}` };
}

test('article validation sanitizes stored HTML, retains safe formatting and converts category IDs', () => {
  const result = articleInput({ ...article, body: '<p onclick="steal()">Story <strong>facts</strong></p><script>alert(1)</script><a href="javascript:alert(1)">link</a>' });
  assert.equal(result.category_id, 2);
  assert.match(result.body, /<strong>facts<\/strong>/);
  assert.doesNotMatch(result.body, /onclick|script|javascript|alert/);
});

test('invalid categories, statuses, flags, empty bodies and unsafe images are rejected', () => {
  for (const change of [{ category_id: '' }, { category_id: '2x' }, { category_id: [] }, { category_id: 0 }, { status: 'unknown' }, { news_type: 'unknown' }, { is_featured: 'false' }, { title: ' ' }, { body: '<script>bad()</script>' }, { featured_image: 'javascript:bad()' }, { title: 'x'.repeat(301) }]) {
    assert.throws(() => articleInput({ ...article, ...change }), { status: 400 });
  }
});

test('updates preserve omitted fields and normalize MySQL boolean values', () => {
  const result = articleInput({ title: 'Updated' }, { ...article, allow_comments: 0, is_featured: 1 });
  assert.equal(result.body, article.body);
  assert.equal(result.title, 'Updated');
  assert.equal(result.allow_comments, false);
  assert.equal(result.is_featured, true);
});

test('scheduled articles require a future date', () => {
  assert.throws(() => articleInput({ ...article, status: 'scheduled' }), { status: 400 });
  assert.throws(() => articleInput({ ...article, status: 'scheduled', scheduled_at: '2000-01-01' }), { status: 400 });
});

test('valid login token authenticates subsequent requests using the current database role', async () => {
  mock.method(pool, 'query', async () => [[user]]);
  const result = await invoke([requireAuth], { headers: auth('admin') });
  assert.equal(result.user.role, 'reader');
});

test('missing and expired sessions are 401, blocked accounts are 403, outages stay 500', async () => {
  assert.equal((await invoke([requireAuth])).status, 401);
  assert.equal((await invoke([requireAuth], { headers: auth('reader', '-1s') })).status, 401);
  const query = mock.method(pool, 'query', async () => [[{ ...user, status: 'blocked' }]]);
  assert.equal((await invoke([requireAuth], { headers: auth() })).status, 403);
  query.mock.mockImplementation(async () => { throw new Error('DB unavailable'); });
  assert.equal((await invoke([requireAuth], { headers: auth() })).status, 500);
});

test('authenticated reader can submit a moderated comment without another login', async () => {
  let inserted;
  mock.method(pool, 'query', async (sql, values) => {
    if (sql.includes('FROM users')) return [[user]];
    if (sql.includes('FROM articles')) { assert.match(sql, /status='published'/); return [[{ allow_comments: 1 }]]; }
    if (sql.startsWith('INSERT INTO comments')) { inserted = values; return [{ affectedRows: 1 }]; }
    throw new Error('Unexpected SQL');
  });
  const result = await invoke(handlers(commentRoutes, 'post', '/article/:articleId'), { headers: auth(), params: { articleId: 'article-1' }, body: { body: 'Useful reporting.' } });
  assert.equal(result.status, 201);
  assert.equal(inserted[2], user.id);
  assert.equal(inserted[4], 'Useful reporting.');
  assert.equal(result.data.data.status, 'pending');
});

test('comments on nonexistent, unpublished or closed articles do not become authentication errors', async () => {
  const query = mock.method(pool, 'query', async sql => sql.includes('FROM users') ? [[user]] : [[]]);
  const request = { headers: auth(), params: { articleId: 'missing' }, body: { body: 'A comment' } };
  assert.equal((await invoke(handlers(commentRoutes, 'post', '/article/:articleId'), request)).status, 404);
  query.mock.mockImplementation(async sql => sql.includes('FROM users') ? [[user]] : [[{ allow_comments: 0 }]]);
  assert.equal((await invoke(handlers(commentRoutes, 'post', '/article/:articleId'), request)).status, 400);
});

test('reader cannot publish even when an old JWT claims admin privileges', async () => {
  mock.method(pool, 'query', async () => [[user]]);
  const result = await invoke(handlers(articleRoutes, 'post', '/'), { headers: auth('admin'), body: article });
  assert.equal(result.status, 403);
});

test('admin publishes to a validated active category', async () => {
  let inserted;
  mock.method(pool, 'query', async (sql, values) => {
    if (sql.includes('FROM users')) return [[{ ...user, role: 'admin' }]];
    if (sql.includes('FROM categories')) { assert.equal(values[0], 2); assert.match(sql, /is_active=1/); return [[{ id: 2 }]]; }
    if (sql.startsWith('INSERT INTO articles')) { inserted = values; return [{ affectedRows: 1 }]; }
    throw new Error('Unexpected SQL');
  });
  const result = await invoke(handlers(articleRoutes, 'post', '/'), { headers: auth('admin'), body: article });
  assert.equal(result.status, 201);
  assert.equal(result.data.data.status, 'published');
  assert.equal(inserted[8], 2);
  assert.equal(inserted[9], user.id);
  assert.ok(inserted[24] instanceof Date);
});

test('inactive categories are rejected before any article insert', async () => {
  mock.method(pool, 'query', async sql => {
    if (sql.includes('FROM users')) return [[{ ...user, role: 'admin' }]];
    if (sql.includes('FROM categories')) return [[]];
    throw new Error('Must not insert');
  });
  assert.equal((await invoke(handlers(articleRoutes, 'post', '/'), { headers: auth(), body: article })).status, 400);
});

test('reporter publication requests are saved for review', async () => {
  mock.method(pool, 'query', async sql => sql.includes('FROM users') ? [[{ ...user, role: 'reporter' }]] : sql.includes('FROM categories') ? [[{ id: 2 }]] : [{ affectedRows: 1 }]);
  const result = await invoke(handlers(articleRoutes, 'post', '/'), { headers: auth(), body: article });
  assert.equal(result.status, 201);
  assert.equal(result.data.data.status, 'review');
});

test('article revisions and edits commit together, and roll back on update failure', async () => {
  mock.method(pool, 'query', async sql => sql.includes('FROM users') ? [[{ ...user, role: 'admin' }]] : sql.includes('FROM categories') ? [[{ id: 2 }]] : [[{ ...article, id: 'a1', slug: 'story', author_id: user.id }]]);
  const events = [];
  let fail = false;
  mock.method(pool, 'getConnection', async () => ({
    async beginTransaction() { events.push('begin'); },
    async query(sql) { events.push(sql.startsWith('INSERT') ? 'revision' : 'update'); if (fail && sql.startsWith('UPDATE')) throw new Error('write failed'); },
    async commit() { events.push('commit'); }, async rollback() { events.push('rollback'); }, release() { events.push('release'); },
  }));
  const request = { headers: auth(), params: { id: 'a1' }, body: { title: 'Updated headline' } };
  assert.equal((await invoke(handlers(articleRoutes, 'put', '/:id'), request)).status, 200);
  assert.deepEqual(events, ['begin', 'revision', 'update', 'commit', 'release']);
  events.length = 0; fail = true;
  assert.equal((await invoke(handlers(articleRoutes, 'put', '/:id'), request)).status, 500);
  assert.deepEqual(events, ['begin', 'revision', 'update', 'rollback', 'release']);
});
