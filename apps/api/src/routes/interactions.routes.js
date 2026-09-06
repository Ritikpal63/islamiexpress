const router=require('express').Router();
const { randomUUID, createHash }=require('crypto');
const pool=require('../config/db');
const asyncHandler=require('../utils/asyncHandler');
const {optionalAuth,requireAuth}=require('../middleware/auth');

router.post('/:articleId/view', optionalAuth, asyncHandler(async(req,res)=>{
  const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').toString().split(',')[0].trim();
  const ipHash=createHash('sha256').update(ip).digest('hex');
  await pool.query('INSERT INTO article_views(article_id,user_id,session_key,ip_hash,referrer) VALUES(?,?,?,?,?)',[req.params.articleId,req.user?.id||null,req.body.session_key||null,ipHash,req.body.referrer||null]);
  res.status(201).json({success:true});
}));

router.post('/:articleId/like',requireAuth,asyncHandler(async(req,res)=>{
  const [rows]=await pool.query('SELECT 1 FROM article_likes WHERE article_id=? AND user_id=?',[req.params.articleId,req.user.id]);
  if(rows.length) await pool.query('DELETE FROM article_likes WHERE article_id=? AND user_id=?',[req.params.articleId,req.user.id]);
  else await pool.query('INSERT INTO article_likes(article_id,user_id) VALUES(?,?)',[req.params.articleId,req.user.id]);
  const [[count]]=await pool.query('SELECT COUNT(*) count FROM article_likes WHERE article_id=?',[req.params.articleId]);
  res.json({success:true,liked:!rows.length,count:count.count});
}));

router.post('/:articleId/save',requireAuth,asyncHandler(async(req,res)=>{
  const [rows]=await pool.query('SELECT 1 FROM saved_articles WHERE article_id=? AND user_id=?',[req.params.articleId,req.user.id]);
  if(rows.length) await pool.query('DELETE FROM saved_articles WHERE article_id=? AND user_id=?',[req.params.articleId,req.user.id]);
  else await pool.query('INSERT INTO saved_articles(article_id,user_id) VALUES(?,?)',[req.params.articleId,req.user.id]);
  res.json({success:true,saved:!rows.length});
}));

router.post('/:articleId/share',optionalAuth,asyncHandler(async(req,res)=>{
  const allowed=['whatsapp','facebook','x','telegram','linkedin','email','copy','other'];
  const platform=allowed.includes(req.body.platform)?req.body.platform:'other';
  await pool.query('INSERT INTO article_shares(article_id,user_id,platform) VALUES(?,?,?)',[req.params.articleId,req.user?.id||null,platform]);
  res.status(201).json({success:true});
}));

router.get('/saved/me',requireAuth,asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT a.id,a.title,a.slug,a.summary,a.featured_image,a.published_at,c.name category_name,c.slug category_slug FROM saved_articles s JOIN articles a ON a.id=s.article_id JOIN categories c ON c.id=a.category_id WHERE s.user_id=? ORDER BY s.created_at DESC`,[req.user.id]);
  res.json({success:true,data:rows});
}));

module.exports=router;
