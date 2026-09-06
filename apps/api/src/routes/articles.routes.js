const router = require('express').Router();
const { randomUUID } = require('crypto');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slug');
const { optionalAuth, requireAuth, allowRoles } = require('../middleware/auth');

const articleSelect = `SELECT a.id,a.author_id,a.title,a.slug,a.summary,a.body,a.featured_image,a.image_caption,a.image_credit,a.location,a.language,a.status,a.news_type,a.is_featured,a.is_top_story,a.is_editors_pick,a.allow_comments,a.seo_title,a.seo_description,a.canonical_url,a.correction_note,a.published_at,a.updated_at,a.created_at,c.name category_name,c.slug category_slug,u.name author_name,u.avatar_url author_avatar,u.bio author_bio,
(SELECT COUNT(*) FROM article_likes l WHERE l.article_id=a.id) like_count,
(SELECT COUNT(*) FROM comments cm WHERE cm.article_id=a.id AND cm.status='approved') comment_count,
(SELECT COUNT(*) FROM article_shares s WHERE s.article_id=a.id) share_count,
(SELECT COUNT(*) FROM article_views v WHERE v.article_id=a.id) view_count
FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id`;

router.get('/', optionalAuth, asyncHandler(async (req,res) => {
  const page = Math.max(1,Number(req.query.page||1));
  const limit = Math.min(50,Math.max(1,Number(req.query.limit||12)));
  const offset=(page-1)*limit;
  const where=["a.status='published'","(a.published_at IS NULL OR a.published_at<=NOW())"];
  const params=[];
  if (req.query.category) { where.push('c.slug=?'); params.push(req.query.category); }
  if (req.query.type) { where.push('a.news_type=?'); params.push(req.query.type); }
  if (req.query.featured==='1') where.push('a.is_featured=1');
  if (req.query.top==='1') where.push('a.is_top_story=1');
  if (req.query.editors_pick==='1') where.push('a.is_editors_pick=1');
  if (req.query.q) { where.push('(a.title LIKE ? OR a.summary LIKE ? OR a.body LIKE ?)'); const q=`%${req.query.q}%`; params.push(q,q,q); }
  const sql=`${articleSelect} WHERE ${where.join(' AND ')} ORDER BY a.published_at DESC,a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit,offset);
  const [rows]=await pool.query(sql,params);
  res.json({success:true,data:rows,pagination:{page,limit}});
}));

router.get('/trending', asyncHandler(async (req,res) => {
  const limit=Math.min(20,Number(req.query.limit||8));
  const [rows]=await pool.query(`${articleSelect} WHERE a.status='published' AND a.published_at>=DATE_SUB(NOW(), INTERVAL 7 DAY)
  ORDER BY ((SELECT COUNT(*) FROM article_views v WHERE v.article_id=a.id)*1 + (SELECT COUNT(*) FROM article_likes l WHERE l.article_id=a.id)*5 + (SELECT COUNT(*) FROM comments cm WHERE cm.article_id=a.id AND cm.status='approved')*4 + (SELECT COUNT(*) FROM article_shares s WHERE s.article_id=a.id)*6) DESC, a.published_at DESC LIMIT ?`,[limit]);
  res.json({success:true,data:rows});
}));

router.get('/:slug', optionalAuth, asyncHandler(async (req,res) => {
  const [rows]=await pool.query(`${articleSelect} WHERE a.slug=? AND a.status='published' LIMIT 1`,[req.params.slug]);
  if (!rows.length) return res.status(404).json({success:false,message:'Article not found'});
  const article=rows[0];
  if (req.user) {
    const [[like],[saved]] = await Promise.all([
      pool.query('SELECT 1 FROM article_likes WHERE article_id=? AND user_id=?',[article.id,req.user.id]),
      pool.query('SELECT 1 FROM saved_articles WHERE article_id=? AND user_id=?',[article.id,req.user.id])
    ]);
    article.liked_by_me=like.length>0; article.saved_by_me=saved.length>0;
  }
  const [related]=await pool.query(`${articleSelect} WHERE a.status='published' AND a.category_id=(SELECT category_id FROM articles WHERE id=?) AND a.id<>? ORDER BY a.published_at DESC LIMIT 4`,[article.id,article.id]);
  article.related=related;
  res.json({success:true,data:article});
}));

router.post('/', requireAuth, allowRoles('reporter','editor','admin','super_admin'), asyncHandler(async (req,res) => {
  const b=req.body;
  if(!b.title||!b.body||!b.category_id) return res.status(400).json({success:false,message:'title, body and category_id are required'});
  const id=randomUUID();
  const slug=(b.slug?slugify(b.slug):slugify(b.title))+'-'+id.slice(0,8);
  const canPublish=['editor','admin','super_admin'].includes(req.user.role);
  let status=b.status||'draft'; if (status==='published'&&!canPublish) status='review';
  const publishedAt=status==='published' ? new Date() : null;
  await pool.query(`INSERT INTO articles(id,title,slug,summary,body,featured_image,image_caption,image_credit,category_id,author_id,location,language,status,news_type,is_featured,is_top_story,is_editors_pick,allow_comments,seo_title,seo_description,canonical_url,source_name,source_url,scheduled_at,published_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,b.title,slug,b.summary||null,b.body,b.featured_image||null,b.image_caption||null,b.image_credit||null,b.category_id,req.user.id,b.location||null,b.language||'en',status,b.news_type||'normal',!!b.is_featured,!!b.is_top_story,!!b.is_editors_pick,b.allow_comments!==false,b.seo_title||null,b.seo_description||null,b.canonical_url||null,b.source_name||null,b.source_url||null,b.scheduled_at||null,publishedAt]);
  res.status(201).json({success:true,data:{id,slug,status}});
}));

router.put('/:id', requireAuth, allowRoles('reporter','editor','admin','super_admin'), asyncHandler(async (req,res) => {
  const [rows]=await pool.query('SELECT * FROM articles WHERE id=?',[req.params.id]);
  const current=rows[0]; if(!current) return res.status(404).json({success:false,message:'Article not found'});
  if(req.user.role==='reporter' && current.author_id!==req.user.id) return res.status(403).json({success:false,message:'You can edit only your articles'});
  await pool.query('INSERT INTO article_revisions(article_id,editor_id,title,summary,body,change_note) VALUES(?,?,?,?,?,?)',[current.id,req.user.id,current.title,current.summary,current.body,req.body.change_note||'Article updated']);
  const b=req.body; const canPublish=['editor','admin','super_admin'].includes(req.user.role);
  let status=b.status??current.status; if(status==='published'&&!canPublish) status='review';
  await pool.query(`UPDATE articles SET title=?,summary=?,body=?,featured_image=?,category_id=?,location=?,status=?,news_type=?,is_featured=?,is_top_story=?,is_editors_pick=?,allow_comments=?,seo_title=?,seo_description=?,correction_note=?,published_at=CASE WHEN ?='published' AND published_at IS NULL THEN NOW() ELSE published_at END WHERE id=?`,[
    b.title??current.title,b.summary??current.summary,b.body??current.body,b.featured_image??current.featured_image,b.category_id??current.category_id,b.location??current.location,status,b.news_type??current.news_type,b.is_featured??current.is_featured,b.is_top_story??current.is_top_story,b.is_editors_pick??current.is_editors_pick,b.allow_comments??current.allow_comments,b.seo_title??current.seo_title,b.seo_description??current.seo_description,b.correction_note??current.correction_note,status,current.id]);
  res.json({success:true,message:'Article updated'});
}));

module.exports=router;
