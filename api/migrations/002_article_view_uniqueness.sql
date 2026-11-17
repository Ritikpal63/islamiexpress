-- Count at most one article view per signed-in user or anonymous browser ID.
-- Keep the earliest existing row before adding uniqueness constraints.
DELETE older FROM article_views older
JOIN article_views newer
  ON newer.article_id = older.article_id
 AND newer.user_id = older.user_id
 AND newer.user_id IS NOT NULL
 AND newer.id < older.id;

DELETE older FROM article_views older
JOIN article_views newer
  ON newer.article_id = older.article_id
 AND newer.session_key = older.session_key
 AND newer.session_key IS NOT NULL
 AND newer.id < older.id;

ALTER TABLE article_views
  ADD UNIQUE KEY uq_article_views_user (article_id, user_id),
  ADD UNIQUE KEY uq_article_views_session (article_id, session_key);
