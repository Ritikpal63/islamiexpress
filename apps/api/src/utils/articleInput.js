const sanitizeHtml = require('sanitize-html');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function articleInput(input, current = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Article data is required');
  const data = { ...current, ...input };
  for (const [field, max] of Object.entries({ title: 300, summary: 800, body: 200000, slug: 300,
    featured_image: 500, image_caption: 500, image_credit: 180, location: 120, language: 12,
    seo_title: 300, seo_description: 500, canonical_url: 500, source_name: 180, source_url: 500,
    correction_note: 5000, change_note: 500 })) {
    if (data[field] == null) continue;
    if (typeof data[field] !== 'string' || data[field].length > max) invalid(`${field} must be text of at most ${max} characters`);
    data[field] = data[field].trim();
  }
  if (!data.title || !data.body) invalid('Headline and article body are required');
  data.body = sanitizeHtml(data.body, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 'b', 'i', 'u', 's', 'blockquote', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'], allowProtocolRelative: false,
  });
  if (!sanitizeHtml(data.body, { allowedTags: [], allowedAttributes: {} }).trim()) invalid('Article body must contain readable text');
  if (!['string', 'number'].includes(typeof data.category_id) || !/^\d+$/.test(String(data.category_id)) ||
      !Number.isSafeInteger(Number(data.category_id)) || Number(data.category_id) < 1) invalid('Choose a valid category');
  data.category_id = Number(data.category_id);
  data.status = data.status || 'draft';
  data.news_type = data.news_type || 'normal';
  data.language = data.language || 'en';
  if (!['draft', 'review', 'scheduled', 'published', 'rejected', 'archived'].includes(data.status)) invalid('Invalid article status');
  if (!['normal', 'breaking', 'live', 'exclusive', 'fact_check', 'opinion'].includes(data.news_type)) invalid('Invalid news type');
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(data.language)) invalid('Invalid article language');
  for (const field of ['is_featured', 'is_top_story', 'is_editors_pick', 'allow_comments']) {
    if (data[field] === undefined) data[field] = field === 'allow_comments';
    if (![true, false, 0, 1].includes(data[field])) invalid(`${field} must be true or false`);
    data[field] = Boolean(data[field]);
  }
  for (const field of ['featured_image', 'canonical_url', 'source_url']) {
    if (!data[field]) continue;
    if (field === 'featured_image' && /^\/assets\/[\w./-]+$/.test(data[field]) && !data[field].includes('..')) continue;
    let url;
    try { url = new URL(data[field]); } catch { invalid(`${field} must be a valid HTTP(S) URL`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) invalid(`${field} must be a valid HTTP(S) URL`);
  }
  if (data.status === 'scheduled') {
    const date = new Date(data.scheduled_at);
    if (!data.scheduled_at || !Number.isFinite(date.getTime()) || date <= new Date()) invalid('Choose a future publication date');
    data.scheduled_at = date;
  } else data.scheduled_at = null;
  return data;
}
module.exports = articleInput;
