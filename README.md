# Islami Express — Digital Newspaper Platform

A full-stack starter for turning a daily print newspaper into a modern digital newsroom. The codebase uses **Next.js + React** for the public web app, **Node.js + Express** for the API, and **MySQL** for publishing, users, engagement, ads, e-paper and newsroom data.

## Included

### Public news website
- Responsive desktop/tablet/mobile news layout
- Breaking-news ticker
- Lead story, featured stories, latest news, editor's picks and trending
- Category pages and latest-news timeline
- Search
- Full article pages with NewsArticle JSON-LD
- Visible author, publication time, location, article type and correction/update note
- Related news
- Responsive ad placeholders/positions
- E-paper archive
- RSS feed at `/rss.xml`
- News sitemap at `/news-sitemap.xml`
- Standard sitemap + robots
- Newsletter signup
- About, Editorial Policy, Corrections Policy, Advertise, Contact and Privacy starter pages
- PWA manifest starter

### Reader engagement
- Reader registration/login
- Like/unlike articles
- Save/unsave articles
- Saved-news page
- Share tracking for WhatsApp, Facebook, X, Telegram, LinkedIn/email/copy-ready schema
- Comments
- Comment likes
- Comment reports
- Moderation statuses: pending, approved, rejected, spam, deleted
- Engagement counts and trending score

### Newsroom/CMS architecture
- Roles: reader, reporter, editor, admin, super-admin
- Article workflow: draft → review → scheduled/published → archived
- News types: normal, breaking, live, exclusive, fact check, opinion
- Top story, featured and editor-pick flags
- Article revisions
- Correction notes
- Scheduled publishing worker
- Categories/subcategories and tags schema
- Live-blog schema + update model
- Author bios/profiles
- E-paper publishing endpoint
- Comment moderation dashboard
- Newsroom dashboard metrics
- User/role management endpoints
- Advertisement positions, campaigns, dates and ad events
- Homepage-section configuration schema

### Features deliberately modeled for a real newspaper
- Clear separation of editorial and advertising content
- Direct ads plus integration points for AdSense/Ad Manager
- Article source/source URL fields
- Image caption and image credit
- Canonical URL and per-article SEO fields
- Language field for future multilingual editions
- City/edition field for e-paper
- Privacy-minded IP hashing for article-view records
- Rate limiting middleware
- Comment moderation before monetized pages display user-generated content

## Project structure

```text
islamiexpress/
├── apps/
│   ├── api/          Express API
│   └── web/          Next.js website + CMS screens
├── database/
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml
├── .env.example
└── package.json
```

## Local setup

### 1. Environment

```bash
cp .env.example .env
```

Change at least `JWT_SECRET` before using the project.

### 2. Start MySQL

With Docker:

```bash
docker compose up -d mysql
```

This initializes the database with the schema, categories, ad positions, homepage sections and demo news stories.

If you already have MySQL, create/import manually:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p islamiexpress < database/seed.sql
```

### 3. Install packages

```bash
npm install
```

### 4. Create the real super-admin

```bash
npm --workspace apps/api run create-admin -- "Editor Name" editor@example.com "StrongPassword123!"
```

The demo author in `seed.sql` is blocked and exists only to own starter articles.

### 5. Run API

```bash
npm run dev:api
```

API: `http://localhost:8000/api`

### 6. Run web app

In another terminal:

```bash
npm run dev:web
```

Website: `http://localhost:3000`

CMS dashboard: `http://localhost:3000/admin`

Article editor: `http://localhost:3000/admin/articles`

Comment moderation: `http://localhost:3000/admin/comments`

## Main API routes

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/articles
GET  /api/articles/trending
GET  /api/articles/:slug
POST /api/articles
PUT  /api/articles/:id

POST /api/interactions/:articleId/view
POST /api/interactions/:articleId/like
POST /api/interactions/:articleId/save
POST /api/interactions/:articleId/share
GET  /api/interactions/saved/me

GET  /api/comments/article/:articleId
POST /api/comments/article/:articleId
POST /api/comments/:id/like
POST /api/comments/:id/report
PATCH /api/comments/:id/moderate

GET  /api/public/categories
GET  /api/public/epapers
GET  /api/public/authors/:id
GET  /api/public/ads/:position
POST /api/public/ads/:id/event
POST /api/public/newsletter

GET  /api/admin/dashboard
GET  /api/admin/articles
GET  /api/admin/comments
GET  /api/admin/users
PATCH /api/admin/users/:id/role
POST /api/admin/epapers
GET  /api/admin/ads
```

## Production services to connect

The repository intentionally does not contain provider secrets. Before production, connect:

- **Cloudinary / S3** for article image and e-paper PDF uploads
- **Google AdSense or Google Ad Manager** using the publisher's approved account
- **GA4 / first-party analytics**
- **Firebase Cloud Messaging** or another provider for breaking-news push notifications
- **Email provider** for email verification, password reset and newsletter delivery
- **Google Search Console** and appropriate webmaster verification
- CDN/cache layer for high traffic

## Recommended next production modules

The database already leaves room for many of these, but they should be completed with the publication's operational requirements and provider credentials:

- Cloud image/PDF upload UI instead of URL fields
- Rich-text editor such as TipTap/CKEditor
- Drag-and-drop homepage manager
- Full live-blog editing UI
- Web Stories
- Video newsroom / YouTube ingestion
- Polls with anti-abuse controls
- Push notification composer
- Email OTP verification and password reset
- Location/state editions
- Multilingual routes (for example Hindi/Urdu/English if the publication chooses)
- Detailed GA4/Search Console/ad analytics dashboards
- Consent-management platform if required for target jurisdictions
- Automated backups and disaster recovery

## Before public launch

Replace all starter transparency copy with **real, verified publication information**: company/publisher identity, ownership/funding disclosures where applicable, registered office, newsroom contacts, editorial leadership, corrections contact, advertising contact, privacy policy and legal terms. Do not publish placeholder addresses or contact information.

Review editorial, advertising, privacy, cookie, comments and moderation policies with the newspaper's management/legal adviser. Configure backups, HTTPS, DB least-privilege credentials, secret management, upload validation, CSP, logging/monitoring and CDN/DDoS protection.
# islamiexpress
