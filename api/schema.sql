CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'reader',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  avatar_url VARCHAR(1000) NULL,
  bio TEXT NULL,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  email_verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_created (role, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  parent_id CHAR(36) NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_active_order (is_active, display_order, name),
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  summary VARCHAR(800) NULL,
  body LONGTEXT NOT NULL,
  featured_image VARCHAR(500) NULL,
  image_caption VARCHAR(500) NULL,
  image_credit VARCHAR(180) NULL,
  location VARCHAR(120) NULL,
  language VARCHAR(12) NOT NULL DEFAULT 'en',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  news_type VARCHAR(30) NOT NULL DEFAULT 'normal',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_top_story TINYINT(1) NOT NULL DEFAULT 0,
  is_editors_pick TINYINT(1) NOT NULL DEFAULT 0,
  allow_comments TINYINT(1) NOT NULL DEFAULT 1,
  seo_title VARCHAR(300) NULL,
  seo_description VARCHAR(500) NULL,
  canonical_url VARCHAR(500) NULL,
  correction_note VARCHAR(5000) NULL,
  source_name VARCHAR(180) NULL,
  source_url VARCHAR(500) NULL,
  scheduled_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_articles_slug (slug),
  KEY idx_articles_status_published (status, published_at),
  KEY idx_articles_category_published (category_id, status, published_at),
  KEY idx_articles_author (author_id),
  KEY idx_articles_scheduled (status, scheduled_at),
  CONSTRAINT fk_articles_author
    FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT fk_articles_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  editor_id CHAR(36) NOT NULL,
  title VARCHAR(300) NOT NULL,
  summary VARCHAR(800) NULL,
  body LONGTEXT NOT NULL,
  change_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_revisions_article_created (article_id, created_at),
  CONSTRAINT fk_revisions_article
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_revisions_editor
    FOREIGN KEY (editor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  session_key VARCHAR(128) NULL,
  ip_hash CHAR(64) NULL,
  referrer VARCHAR(2048) NULL,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_article_views_user (article_id, user_id),
  UNIQUE KEY uq_article_views_session (article_id, session_key),
  KEY idx_views_article_time (article_id, viewed_at),
  KEY idx_views_time (viewed_at),
  CONSTRAINT fk_views_article
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_views_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_likes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_article_likes_user (article_id, user_id),
  KEY idx_article_likes_created (created_at),
  CONSTRAINT fk_article_likes_article
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_article_likes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved_articles_user (article_id, user_id),
  KEY idx_saved_articles_user_created (user_id, created_at),
  CONSTRAINT fk_saved_articles_article
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_articles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS article_shares (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  platform VARCHAR(30) NOT NULL DEFAULT 'other',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_article_shares_article (article_id),
  KEY idx_article_shares_created (created_at),
  CONSTRAINT fk_article_shares_article
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_article_shares_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  body TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  report_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comments_article_status_created (article_id, status, created_at),
  KEY idx_comments_status_created (status, created_at),
  CONSTRAINT fk_comments_article
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_comments_parent
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_likes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  comment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comment_likes_user (comment_id, user_id),
  CONSTRAINT fk_comment_likes_comment
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_likes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  comment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comment_reports_user (comment_id, user_id),
  CONSTRAINT fk_comment_reports_comment
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS epapers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_date DATE NOT NULL,
  edition_name VARCHAR(190) NOT NULL DEFAULT 'Main Edition',
  city VARCHAR(120) NULL,
  language VARCHAR(20) NOT NULL DEFAULT 'en',
  cover_image VARCHAR(1000) NOT NULL,
  pdf_url VARCHAR(1000) NOT NULL,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_epapers_published_date (is_published, edition_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ad_positions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  device VARCHAR(20) NOT NULL DEFAULT 'all',
  width INT UNSIGNED NOT NULL,
  height INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_ad_positions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS advertisements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  advertiser VARCHAR(180) NULL,
  position_id INT UNSIGNED NOT NULL,
  creative_url VARCHAR(500) NOT NULL,
  target_url VARCHAR(500) NULL,
  ad_type VARCHAR(30) NOT NULL DEFAULT 'direct',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ads_position_status_dates (position_id, status, start_at, end_at),
  KEY idx_ads_created (created_at),
  CONSTRAINT fk_ads_position
    FOREIGN KEY (position_id) REFERENCES ad_positions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ad_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  advertisement_id CHAR(36) NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ad_events_ad_type_created (advertisement_id, event_type, created_at),
  CONSTRAINT fk_ad_events_ad
    FOREIGN KEY (advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_newsletter_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `categories` (`id`, `name`, `slug`, `parent_id`, `description`, `display_order`, `is_active`) VALUES
(1, 'Latest', 'latest', NULL, NULL, 1, 1,),
(2, 'India', 'india', NULL, NULL, 2, 1,),
(3, 'World', 'world', NULL, NULL, 3, 1,),
(4, 'Politics', 'politics', NULL, NULL, 4, 1,),
(5, 'Business', 'business', NULL, NULL, 5, 1,),
(6, 'Sports', 'sports', NULL, NULL, 6, 1,),
(7, 'Entertainment', 'entertainment', NULL, NULL, 7, 1,),
(8, 'Education', 'education', NULL, NULL, 8, 1,),
(9, 'Technology', 'technology', NULL, NULL, 9, 1,),
(10, 'Health', 'health', NULL, NULL, 10, 1,),
(11, 'Crime', 'crime', NULL, NULL, 11, 1,),
(12, 'Lifestyle', 'lifestyle', NULL, NULL, 12, 1,),
(13, 'Opinion', 'opinion', NULL, NULL, 13, 1,),
(14, 'Fact Check', 'fact-check', NULL, NULL, 14, 1,),
(15, 'Videos', 'videos', NULL, NULL, 15, 1,)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  is_active = VALUES(is_active),
  display_order = VALUES(display_order);

CREATE TABLE IF NOT EXISTS auth_email_otps (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  purpose ENUM('register','login') NOT NULL,
  code_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_auth_email_otp_user_purpose (user_id,purpose),
  KEY idx_auth_email_otp_expiry (expires_at),
  CONSTRAINT fk_auth_email_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
