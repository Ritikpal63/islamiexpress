// Production-build browser regression with a local fixture API. No real accounts or database writes.
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { once } = require('node:events');
const { chromium } = require('playwright-core');

const stories = [{
  id: 'fixture-story', slug: 'fixture-story', title: 'Fixture news story', summary: 'A test report.',
  body: '<p>Published story for reader comments.</p>', category_id: 1, category_name: 'India', category_slug: 'india',
  author_name: 'Test Editor', language: 'en', status: 'published', news_type: 'normal', allow_comments: true,
  featured_image: '/assets/News-Images/news2.jpeg', published_at: new Date().toISOString(), updated_at: new Date().toISOString(), related: [],
}];
const categories = [{ id: 1, name: 'India', slug: 'india' }, { id: 2, name: 'Sports', slug: 'sports' }];
let comments = 0;
let failComments = false;
let api, app, browser;
let logs = '';
let activePage;
const requests = [];

async function main() {
  api = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture');
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const role = req.headers.authorization === 'Bearer fixture-admin' ? 'admin' : req.headers.authorization === 'Bearer fixture-reader' ? 'reader' : null;
    const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (url.pathname === '/api/auth/login') {
      const role = body.email === 'admin@example.test' ? 'admin' : 'reader';
      return send({ success: true, token: `fixture-${role}`, user: { id: role, role, name: role } });
    }
    if (url.pathname === '/api/auth/me') return role ? send({ data: { id: role, role, name: role } }) : send({ message: 'Authentication required' }, 401);
    if (url.pathname === '/api/public/categories') return send({ data: categories });
    if (url.pathname.startsWith('/api/admin/')) {
      if (role !== 'admin') return send({ message: 'Permission denied' }, role ? 403 : 401);
      if (url.pathname === '/api/admin/articles') return send({ data: stories });
      return send({ data: stories.find(story => story.id === url.pathname.split('/').pop()) });
    }
    if (url.pathname.startsWith('/api/comments/article/')) {
      if (req.method === 'GET') return send({ data: [] });
      if (!role) return send({ message: 'Authentication required' }, 401);
      if (failComments) return send({ message: 'Temporary comment service failure' }, 503);
      comments++;
      return send({ success: true, data: { id: `comment-${comments}`, status: 'pending' } }, 201);
    }
    if (url.pathname === '/api/articles' && req.method === 'POST') {
      if (role !== 'admin') return send({ message: 'Permission denied' }, 403);
      const category = categories.find(category => category.id === body.category_id);
      assert.ok(category);
      const article = { ...body, id: 'new-story', slug: 'new-story', category_name: category.name, category_slug: category.slug, author_name: 'Test Editor', published_at: new Date().toISOString(), updated_at: new Date().toISOString(), related: [] };
      stories.push(article);
      return send({ success: true, data: article }, 201);
    }
    if (url.pathname.startsWith('/api/articles/') && req.method === 'PUT') {
      if (role !== 'admin') return send({ message: 'Permission denied' }, 403);
      const story = stories.find(story => story.id === url.pathname.split('/').pop());
      Object.assign(story, body);
      return send({ success: true, data: story });
    }
    if (url.pathname === '/api/articles' || url.pathname === '/api/articles/trending') {
      return send({ data: stories.filter(story => story.status === 'published' && (!url.searchParams.get('category') || story.category_slug === url.searchParams.get('category'))) });
    }
    if (url.pathname.startsWith('/api/articles/')) {
      const story = stories.find(story => story.slug === decodeURIComponent(url.pathname.split('/').pop()) && story.status === 'published');
      return story ? send({ data: story }) : send({ message: 'Article not found' }, 404);
    }
    send({ data: [] });
  });
  api.listen(0, '127.0.0.1'); await once(api, 'listening');
  const port = Number(process.env.TEST_WEB_PORT || 3219);
  const base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: path.resolve('apps/web'), env: { ...process.env, VERCEL: '0', API_URL: `http://127.0.0.1:${api.address().port}/api` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  app.stdout.on('data', chunk => { logs += chunk; }); app.stderr.on('data', chunk => { logs += chunk; });
  const deadline = Date.now() + 30000;
  while (true) {
    try { const response = await fetch(`${base}/login`); if (response.ok) break; } catch {}
    if (Date.now() > deadline || app.exitCode !== null) throw new Error(`Next server failed to start: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  activePage = page;
  page.on('response', async response => { if (response.url().includes('/api/')) requests.push({url:response.url(),status:response.status(),body:response.status()>=400?await response.text().catch(()=> ''):undefined}); });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${base}/article/fixture-story`);
  await page.getByLabel('Your comment').fill('Preserve this comment through login.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await page.waitForURL('**/login?next=**');
  await page.getByLabel('Email', { exact: true }).fill('reader@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/article/fixture-story#comments');
  assert.equal(await page.getByLabel('Your comment').inputValue(), 'Preserve this comment through login.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await page.getByText('Comment submitted for moderation.', { exact: true }).waitFor();
  assert.equal(comments, 1);
  assert.match(page.url(), /article\/fixture-story/);
  assert.equal(await page.evaluate(() => localStorage.getItem('ie_token')), null);
  assert.equal((await context.cookies()).find(cookie => cookie.name === 'ie_session').httpOnly, true);
  console.log('PASS: mobile login returns to the article, restores the draft, and posts using the cookie session.');

  failComments = true;
  await page.getByLabel('Your comment').fill('Keep this draft during service outage.');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await page.getByText('Temporary comment service failure', { exact: true }).waitFor();
  assert.match(page.url(), /article\/fixture-story/);
  assert.equal(await page.getByLabel('Your comment').inputValue(), 'Keep this draft during service outage.');
  failComments = false;
  console.log('PASS: service failures preserve the comment and do not redirect a logged-in reader.');

  await page.goto(`${base}/admin/articles`);
  await page.getByText('An editor or administrator account is required to manage news.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Headline', { exact: true }).count(), 0);
  await context.clearCookies();
  await page.goto(`${base}/login?next=%2Fadmin%2Farticles`);
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL('**/admin/articles');
  await page.getByLabel('Headline', { exact: true }).fill('Production publishing regression');
  await page.getByLabel('Summary', { exact: true }).fill('A categorized news story.');
  await page.getByLabel('Article body', { exact: true }).fill('<p>Verified article body.</p>');
  await page.getByLabel('Featured image URL', { exact: true }).fill('/assets/News-Images/news2.jpeg');
  await page.getByLabel('Category', { exact: true }).selectOption('2');
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Publish article', exact: true }).click();
  await page.getByText('Article published. It is available in its selected category.', { exact: true }).waitFor();
  assert.equal(stories.find(story => story.id === 'new-story').category_id, 2);
  await page.goto(`${base}/category/sports`);
  await page.getByRole('link', { name: 'Production publishing regression', exact: true }).waitFor();
  await page.goto(`${base}/admin/articles`);
  const row = page.locator('.cms-list article').filter({ hasText: 'Production publishing regression' });
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Headline', { exact: true }).fill('Updated publishing regression');
  await page.getByRole('button', { name: 'Publish article', exact: true }).click();
  await page.getByText('Article published. It is available in its selected category.', { exact: true }).waitFor();
  assert.equal(stories.find(story => story.id === 'new-story').title, 'Updated publishing regression');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS: reader denied CMS access; admin publishes into Sports and edits the saved story on a mobile viewport.');
}

main().catch(async error => { console.error(error); console.error(requests); if(activePage) console.error('Page:',activePage.url(),await activePage.locator('body').innerText()); if (logs) console.error(logs.slice(-2500)); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (app && app.exitCode === null) { app.kill('SIGTERM'); await once(app, 'exit'); }
  if (api) { api.closeAllConnections(); await new Promise(resolve => api.close(resolve)); }
});
