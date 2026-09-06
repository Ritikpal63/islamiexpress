USE islamiexpress;

INSERT IGNORE INTO categories (name, slug, display_order) VALUES
('Latest','latest',1),('India','india',2),('World','world',3),('Politics','politics',4),('Business','business',5),('Sports','sports',6),('Entertainment','entertainment',7),('Education','education',8),('Technology','technology',9),('Health','health',10),('Crime','crime',11),('Lifestyle','lifestyle',12),('Opinion','opinion',13),('Fact Check','fact-check',14),('Videos','videos',15);

INSERT IGNORE INTO ad_positions(code,name,device,width,height) VALUES
('HEADER_LEADERBOARD','Header Leaderboard','desktop',970,90),
('HOME_TOP','Homepage Top','all',728,90),
('HOME_MIDDLE','Homepage Middle','all',728,90),
('SIDEBAR_TOP','Sidebar Top','desktop',300,250),
('ARTICLE_TOP','Article Top','all',728,90),
('ARTICLE_MIDDLE','Article Middle','all',728,90),
('ARTICLE_BOTTOM','Article Bottom','all',728,90),
('MOBILE_STICKY','Mobile Sticky','mobile',320,50);

INSERT IGNORE INTO homepage_sections(section_key,title,display_order) VALUES
('top_stories','Top Stories',1),('latest','Latest News',2),('india','India',3),('politics','Politics',4),('business','Business',5),('sports','Sports',6),('entertainment','Entertainment',7),('videos','Videos',8),('opinion','Opinion',9);

INSERT IGNORE INTO users(id,name,email,password_hash,role,status,bio)
VALUES('00000000-0000-4000-8000-000000000001','Islami Express Desk','desk@demo.invalid','$2y$12$eg7rh9rB3UATK7OxkaMDwevdE6VUpxUjLyaHykS8WL31XwqOFyZW.','reporter','blocked','Demo newsroom author used only for starter content.');

INSERT IGNORE INTO articles(id,title,slug,summary,body,featured_image,category_id,author_id,status,news_type,is_featured,is_top_story,is_editors_pick,published_at)
SELECT '10000000-0000-4000-8000-000000000001','Islami Express enters a new digital era of daily journalism','islamiexpress-digital-era','The print newspaper expands online with breaking news, e-paper access and reader engagement.','<p>Islami Express is preparing a digital newsroom designed for fast, responsible daily publishing.</p><h2>Print and digital together</h2><p>The platform brings articles, the daily e-paper, breaking updates, reader comments and advertising into one publication system.</p>','https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=80',id,'00000000-0000-4000-8000-000000000001','published','breaking',1,1,1,NOW() FROM categories WHERE slug='india' LIMIT 1;

INSERT IGNORE INTO articles(id,title,slug,summary,body,featured_image,category_id,author_id,status,news_type,is_featured,is_top_story,is_editors_pick,published_at)
SELECT '10000000-0000-4000-8000-000000000002','Morning News Brief: the major stories readers should know today','morning-news-brief','A concise look at developments shaping the day across India and the world.','<p>This starter story demonstrates the latest-news layout. Replace demo copy with newsroom reporting from the CMS.</p>','https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',id,'00000000-0000-4000-8000-000000000001','published','normal',1,0,0,DATE_SUB(NOW(),INTERVAL 20 MINUTE) FROM categories WHERE slug='latest' LIMIT 1;

INSERT IGNORE INTO articles(id,title,slug,summary,body,featured_image,category_id,author_id,status,news_type,is_featured,is_top_story,is_editors_pick,published_at)
SELECT '10000000-0000-4000-8000-000000000003','Inside the digital newsroom: from reporter to reader','inside-digital-newsroom','Editorial review, verification, corrections and transparent updates remain central to publishing.','<p>Reporters prepare stories, editors review them, and revision history preserves accountability.</p>','https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',id,'00000000-0000-4000-8000-000000000001','published','exclusive',0,0,1,DATE_SUB(NOW(),INTERVAL 1 HOUR) FROM categories WHERE slug='technology' LIMIT 1;

INSERT IGNORE INTO articles(id,title,slug,summary,body,featured_image,category_id,author_id,status,news_type,is_featured,is_top_story,is_editors_pick,published_at)
SELECT '10000000-0000-4000-8000-000000000004','Sports Round-up: results, analysis and what comes next','sports-roundup','The latest sports developments, schedules and analysis in one daily briefing.','<p>This demo article represents the sports desk section of the portal.</p>','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',id,'00000000-0000-4000-8000-000000000001','published','normal',1,0,0,DATE_SUB(NOW(),INTERVAL 2 HOUR) FROM categories WHERE slug='sports' LIMIT 1;

INSERT IGNORE INTO articles(id,title,slug,summary,body,featured_image,category_id,author_id,status,news_type,is_featured,is_top_story,is_editors_pick,published_at)
SELECT '10000000-0000-4000-8000-000000000005','Business Watch: markets, companies and the economy in focus','business-watch','Key economic developments explained for everyday readers.','<p>This demo article represents the business desk section of the portal.</p>','https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',id,'00000000-0000-4000-8000-000000000001','published','normal',0,0,1,DATE_SUB(NOW(),INTERVAL 3 HOUR) FROM categories WHERE slug='business' LIMIT 1;

INSERT IGNORE INTO articles(id,title,slug,summary,body,featured_image,category_id,author_id,status,news_type,is_featured,is_top_story,is_editors_pick,published_at)
SELECT '10000000-0000-4000-8000-000000000006','Culture and lifestyle: voices, ideas and stories across communities','culture-lifestyle','People, culture, food, travel and conversations that matter.','<p>This demo article represents features and lifestyle coverage.</p>','https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',id,'00000000-0000-4000-8000-000000000001','published','normal',0,0,0,DATE_SUB(NOW(),INTERVAL 4 HOUR) FROM categories WHERE slug='lifestyle' LIMIT 1;
