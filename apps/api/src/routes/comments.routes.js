const router=require('express').Router();
const {randomUUID}=require('crypto');
const pool=require('../config/db');
const asyncHandler=require('../utils/asyncHandler');
const {requireAuth,allowRoles}=require('../middleware/auth');

router.get('/article/:articleId',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT c.id,c.body,c.parent_id,c.created_at,u.id user_id,u.name,u.avatar_url,(SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id=c.id) like_count FROM comments c JOIN users u ON u.id=c.user_id WHERE c.article_id=? AND c.status='approved' ORDER BY c.created_at DESC`,[req.params.articleId]);
  res.json({success:true,data:rows});
}));

router.post('/article/:articleId',requireAuth,asyncHandler(async(req,res)=>{
  const body=typeof req.body?.body==='string'?req.body.body.trim():'';
  if(body.length<2||body.length>2000) return res.status(400).json({success:false,message:'Comment must be 2-2000 characters'});
  const [[article]]=await pool.query("SELECT allow_comments FROM articles WHERE id=? AND status='published' AND (published_at IS NULL OR published_at<=NOW())",[req.params.articleId]);
  if(!article) return res.status(404).json({success:false,message:'Article not found'});
  if(!article.allow_comments) return res.status(400).json({success:false,message:'Comments are closed'});
  if (req.body.parent_id) {
    const [parents]=await pool.query("SELECT id FROM comments WHERE id=? AND article_id=? AND status='approved'",[req.body.parent_id,req.params.articleId]);
    if (!parents.length) return res.status(400).json({success:false,message:'Invalid parent comment'});
  }
  const id=randomUUID();
  const autoApprove=process.env.AUTO_APPROVE_COMMENTS==='true';
  await pool.query('INSERT INTO comments(id,article_id,user_id,parent_id,body,status) VALUES(?,?,?,?,?,?)',[id,req.params.articleId,req.user.id,req.body.parent_id||null,body,autoApprove?'approved':'pending']);
  res.status(201).json({success:true,data:{id,status:autoApprove?'approved':'pending'}});
}));

router.post('/:id/like',requireAuth,asyncHandler(async(req,res)=>{
  const [rows]=await pool.query('SELECT 1 FROM comment_likes WHERE comment_id=? AND user_id=?',[req.params.id,req.user.id]);
  if(rows.length) await pool.query('DELETE FROM comment_likes WHERE comment_id=? AND user_id=?',[req.params.id,req.user.id]);
  else await pool.query('INSERT INTO comment_likes(comment_id,user_id) VALUES(?,?)',[req.params.id,req.user.id]);
  res.json({success:true,liked:!rows.length});
}));

router.post('/:id/report',requireAuth,asyncHandler(async(req,res)=>{
  await pool.query('INSERT IGNORE INTO comment_reports(comment_id,user_id,reason) VALUES(?,?,?)',[req.params.id,req.user.id,(req.body.reason||'Reported by user').slice(0,300)]);
  await pool.query('UPDATE comments SET report_count=report_count+1 WHERE id=?',[req.params.id]);
  res.status(201).json({success:true});
}));

router.patch('/:id/moderate',requireAuth,allowRoles('editor','admin','super_admin'),asyncHandler(async(req,res)=>{
  const allowed=['approved','rejected','spam','deleted'];
  if(!allowed.includes(req.body.status)) return res.status(400).json({success:false,message:'Invalid status'});
  await pool.query('UPDATE comments SET status=? WHERE id=?',[req.body.status,req.params.id]);
  res.json({success:true});
}));

module.exports=router;
