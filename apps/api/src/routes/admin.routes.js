const router=require('express').Router();
const pool=require('../config/db');
const asyncHandler=require('../utils/asyncHandler');
const {requireAuth,allowRoles}=require('../middleware/auth');
router.use(requireAuth,allowRoles('editor','admin','super_admin'));

router.get('/dashboard',asyncHandler(async(_req,res)=>{
  const results = await Promise.all([
    pool.query(`SELECT COUNT(*) total,SUM(status='published') published,SUM(status='draft') drafts,SUM(status='review') review FROM articles`),
    pool.query(`SELECT COUNT(*) total FROM users WHERE role='reader'`),
    pool.query(`SELECT COUNT(*) total,SUM(status='pending') pending,SUM(status='approved') approved FROM comments`),
    pool.query(`SELECT COUNT(*) total FROM article_views WHERE viewed_at>=CURDATE()`),
    pool.query(`SELECT (SELECT COUNT(*) FROM article_likes WHERE created_at>=CURDATE()) likes,(SELECT COUNT(*) FROM article_shares WHERE created_at>=CURDATE()) shares,(SELECT COUNT(*) FROM saved_articles WHERE created_at>=CURDATE()) saves`)
  ]);
  const articles=results[0][0][0]||{};
  const readers=results[1][0][0]||{};
  const comments=results[2][0][0]||{};
  const views=results[3][0][0]||{};
  const engagement=results[4][0][0]||{};
  const [top]=await pool.query(`SELECT a.title,a.slug,COUNT(v.id) views FROM articles a LEFT JOIN article_views v ON v.article_id=a.id AND v.viewed_at>=CURDATE() WHERE a.status='published' GROUP BY a.id ORDER BY views DESC LIMIT 5`);
  res.json({success:true,data:{articles,readers,comments,today_views:views.total||0,engagement,top}});
}));

router.get('/comments',asyncHandler(async(req,res)=>{
  const status=req.query.status||'pending';
  const [rows]=await pool.query(`SELECT c.id,c.body,c.status,c.report_count,c.created_at,u.name user_name,a.title article_title,a.slug article_slug FROM comments c JOIN users u ON u.id=c.user_id JOIN articles a ON a.id=c.article_id WHERE c.status=? ORDER BY c.created_at DESC LIMIT 100`,[status]);
  res.json({success:true,data:rows});
}));

router.get('/articles',asyncHandler(async(req,res)=>{
  const status=req.query.status||'';
  const params=[];
  let where='1=1';
  if(status){where='a.status=?';params.push(status)}
  const [rows]=await pool.query(`SELECT a.id,a.title,a.slug,a.status,a.news_type,a.is_top_story,a.is_featured,a.published_at,a.updated_at,c.name category_name,u.name author_name FROM articles a JOIN categories c ON c.id=a.category_id JOIN users u ON u.id=a.author_id WHERE ${where} ORDER BY a.updated_at DESC LIMIT 100`,params);
  res.json({success:true,data:rows});
}));

router.get('/revisions/:articleId',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT r.id,r.title,r.summary,r.change_note,r.created_at,u.name editor_name FROM article_revisions r JOIN users u ON u.id=r.editor_id WHERE r.article_id=? ORDER BY r.created_at DESC LIMIT 50`,[req.params.articleId]);
  res.json({success:true,data:rows});
}));

router.get('/users',allowRoles('admin','super_admin'),asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 200`);
  res.json({success:true,data:rows});
}));

router.patch('/users/:id/role',allowRoles('super_admin'),asyncHandler(async(req,res)=>{
  const allowed=['reader','reporter','editor','admin'];
  if(!allowed.includes(req.body.role)) return res.status(400).json({success:false,message:'Invalid role'});
  await pool.query('UPDATE users SET role=? WHERE id=?',[req.body.role,req.params.id]);
  res.json({success:true});
}));

router.post('/epapers',allowRoles('admin','super_admin'),asyncHandler(async(req,res)=>{
  const {randomUUID}=require('crypto'); const b=req.body;
  if(!b.edition_date||!b.cover_image||!b.pdf_url) return res.status(400).json({success:false,message:'edition_date, cover_image and pdf_url required'});
  const id=randomUUID();
  await pool.query('INSERT INTO epapers(id,edition_date,edition_name,city,language,cover_image,pdf_url,is_published) VALUES(?,?,?,?,?,?,?,?)',[id,b.edition_date,b.edition_name||'Main Edition',b.city||null,b.language||'en',b.cover_image,b.pdf_url,b.is_published!==false]);
  res.status(201).json({success:true,data:{id}});
}));

router.get('/ads',allowRoles('admin','super_admin'),asyncHandler(async(_req,res)=>{
  const [rows]=await pool.query(`SELECT a.*,p.code position_code,p.name position_name,(SELECT COUNT(*) FROM ad_events e WHERE e.advertisement_id=a.id AND e.event_type='impression') impressions,(SELECT COUNT(*) FROM ad_events e WHERE e.advertisement_id=a.id AND e.event_type='click') clicks FROM advertisements a JOIN ad_positions p ON p.id=a.position_id ORDER BY a.created_at DESC`);
  res.json({success:true,data:rows});
}));

module.exports=router;
