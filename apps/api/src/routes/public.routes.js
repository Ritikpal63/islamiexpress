const router=require('express').Router();
const {randomUUID}=require('crypto');
const pool=require('../config/db');
const asyncHandler=require('../utils/asyncHandler');

router.get('/categories',asyncHandler(async(_req,res)=>{
  const [rows]=await pool.query('SELECT id,name,slug,parent_id,description FROM categories WHERE is_active=1 ORDER BY display_order,name');
  res.json({success:true,data:rows});
}));

router.get('/epapers',asyncHandler(async(req,res)=>{
  const limit=Math.min(100,Number(req.query.limit||30));
  const [rows]=await pool.query('SELECT * FROM epapers WHERE is_published=1 ORDER BY edition_date DESC LIMIT ?',[limit]);
  res.json({success:true,data:rows});
}));

router.get('/ads/:position',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT a.*,p.code position_code FROM advertisements a JOIN ad_positions p ON p.id=a.position_id WHERE p.code=? AND a.status='active' AND (a.start_at IS NULL OR a.start_at<=NOW()) AND (a.end_at IS NULL OR a.end_at>=NOW()) ORDER BY a.created_at DESC LIMIT 1`,[req.params.position]);
  res.json({success:true,data:rows[0]||null});
}));

router.post('/newsletter',asyncHandler(async(req,res)=>{
  const email=(req.body.email||'').trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({success:false,message:'Valid email required'});
  await pool.query(`INSERT INTO newsletter_subscribers(id,email,status) VALUES(?,?,'active') ON DUPLICATE KEY UPDATE status='active'`,[randomUUID(),email]);
  res.status(201).json({success:true,message:'Subscribed'});
}));

router.get('/authors/:id',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT id,name,avatar_url,bio,role,created_at FROM users WHERE id=? AND role IN ('reporter','editor','admin','super_admin') LIMIT 1`,[req.params.id]);
  if(!rows.length) return res.status(404).json({success:false,message:'Author not found'});
  const [articles]=await pool.query(`SELECT a.id,a.title,a.slug,a.summary,a.featured_image,a.published_at,c.name category_name,c.slug category_slug FROM articles a JOIN categories c ON c.id=a.category_id WHERE a.author_id=? AND a.status='published' ORDER BY a.published_at DESC LIMIT 30`,[req.params.id]);
  res.json({success:true,data:{...rows[0],articles}});
}));

router.post('/ads/:id/event',asyncHandler(async(req,res)=>{
  const type=req.body.event_type;
  if(!['impression','click'].includes(type)) return res.status(400).json({success:false,message:'Invalid event'});
  await pool.query('INSERT INTO ad_events(advertisement_id,event_type) VALUES(?,?)',[req.params.id,type]);
  res.status(201).json({success:true});
}));

module.exports=router;
