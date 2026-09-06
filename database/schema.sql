CREATE DATABASE IF NOT EXISTS islamiexpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE islamiexpress;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('reader','reporter','editor','admin','super_admin') NOT NULL DEFAULT 'reader',
  avatar_url VARCHAR(500) NULL,
  bio TEXT NULL,
  status ENUM('active','blocked','pending') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  parent_id INT NULL,
  description VARCHAR(500) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS articles (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(330) NOT NULL UNIQUE,
  summary VARCHAR(800) NULL,
  body LONGTEXT NOT NULL,
  featured_image VARCHAR(500) NULL,
  image_caption VARCHAR(500) NULL,
  image_credit VARCHAR(180) NULL,
  category_id INT NOT NULL,
  author_id CHAR(36) NOT NULL,
  location VARCHAR(120) NULL,
  language VARCHAR(12) NOT NULL DEFAULT 'en',
  status ENUM('draft','review','scheduled','published','rejected','archived') NOT NULL DEFAULT 'draft',
  news_type ENUM('normal','breaking','live','exclusive','fact_check','opinion') NOT NULL DEFAULT 'normal',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_top_story BOOLEAN NOT NULL DEFAULT FALSE,
  is_editors_pick BOOLEAN NOT NULL DEFAULT FALSE,
  allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  seo_title VARCHAR(300) NULL,
  seo_description VARCHAR(500) NULL,
  canonical_url VARCHAR(500) NULL,
  source_name VARCHAR(180) NULL,
  source_url VARCHAR(500) NULL,
  correction_note TEXT NULL,
  scheduled_at DATETIME NULL,
  published_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_articles_status_published (status, published_at),
  INDEX idx_articles_category (category_id, published_at),
  INDEX idx_articles_flags (is_top_story, is_featured, is_editors_pick),
  FULLTEXT KEY ft_articles_search (title, summary, body)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_revisions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  editor_id CHAR(36) NOT NULL,
  title VARCHAR(300) NOT NULL,
  summary VARCHAR(800) NULL,
  body LONGTEXT NOT NULL,
  change_note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_revisions_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_revisions_editor FOREIGN KEY (editor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_tags (
  article_id CHAR(36) NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY(article_id, tag_id),
  CONSTRAINT fk_article_tags_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_article_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_views (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  session_key VARCHAR(120) NULL,
  ip_hash CHAR(64) NULL,
  referrer VARCHAR(500) NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_views_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_views_article_time(article_id, viewed_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_likes (
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(article_id, user_id),
  CONSTRAINT fk_likes_article FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS saved_articles (
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(article_id, user_id),
  CONSTRAINT fk_saved_article FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS article_shares (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  platform ENUM('whatsapp','facebook','x','telegram','linkedin','email','copy','other') NOT NULL DEFAULT 'other',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shares_article FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_shares_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_shares_article(article_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id CHAR(36) PRIMARY KEY,
  article_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  body VARCHAR(2000) NOT NULL,
  status ENUM('pending','approved','rejected','spam','deleted') NOT NULL DEFAULT 'pending',
  report_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_article FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY(parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  INDEX idx_comments_article(article_id, status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(comment_id, user_id),
  CONSTRAINT fk_comment_likes_comment FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_likes_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comment_reports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  comment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comment_report(comment_id, user_id),
  CONSTRAINT fk_reports_comment FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS live_blogs (
  id CHAR(36) PRIMARY KEY,
  article_id CHAR(36) NOT NULL UNIQUE,
  is_live BOOLEAN NOT NULL DEFAULT TRUE,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  CONSTRAINT fk_live_article FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS live_blog_updates (
  id CHAR(36) PRIMARY KEY,
  live_blog_id CHAR(36) NOT NULL,
  title VARCHAR(300) NULL,
  body TEXT NOT NULL,
  posted_by CHAR(36) NOT NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_live_update_blog FOREIGN KEY(live_blog_id) REFERENCES live_blogs(id) ON DELETE CASCADE,
  CONSTRAINT fk_live_update_user FOREIGN KEY(posted_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS epapers (
  id CHAR(36) PRIMARY KEY,
  edition_date DATE NOT NULL,
  edition_name VARCHAR(120) NOT NULL DEFAULT 'Main Edition',
  city VARCHAR(120) NULL,
  language VARCHAR(12) NOT NULL DEFAULT 'en',
  cover_image VARCHAR(500) NOT NULL,
  pdf_url VARCHAR(500) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_epaper_edition(edition_date, edition_name, language)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ad_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  device ENUM('all','desktop','mobile') NOT NULL DEFAULT 'all',
  width INT NULL,
  height INT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS advertisements (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  advertiser VARCHAR(180) NULL,
  position_id INT NOT NULL,
  creative_url VARCHAR(500) NULL,
  mobile_creative_url VARCHAR(500) NULL,
  target_url VARCHAR(700) NULL,
  ad_type ENUM('direct','adsense','ad_manager','html') NOT NULL DEFAULT 'direct',
  embed_code TEXT NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  status ENUM('draft','active','paused','ended') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ads_position FOREIGN KEY(position_id) REFERENCES ad_positions(id),
  INDEX idx_ads_active(position_id, status, start_at, end_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ad_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  advertisement_id CHAR(36) NOT NULL,
  event_type ENUM('impression','click') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_event FOREIGN KEY(advertisement_id) REFERENCES advertisements(id) ON DELETE CASCADE,
  INDEX idx_ad_event(advertisement_id, event_type, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  status ENUM('active','unsubscribed') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS homepage_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_key VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  category_id INT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config_json JSON NULL,
  CONSTRAINT fk_home_section_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
