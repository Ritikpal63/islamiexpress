const router=require('express').Router();
const pool=require('../config/db');
const asyncHandler=require('../utils/asyncHandler');
const {requireAuth,allowRoles}=require('../middleware/auth');
const {randomUUID}=require('crypto');
const slugify=require('../utils/slug');
router.use(requireAuth,allowRoles('editor','admin','super_admin'));

const adPositions=[
  ['HEADER_LEADERBOARD','Header leaderboard','desktop',970,90],
  ['HOME_TOP','Homepage top','all',728,90],
  ['HOME_MIDDLE','Homepage middle','all',728,90],
  ['HOME_LOWER','Homepage lower','all',728,90],
  ['HOME_SIDEBAR_TOP','Homepage side — top','desktop',300,250],
  ['HOME_SIDEBAR_BOTTOM','Homepage side — bottom','desktop',300,250],
  ['CATEGORY_TOP','Category page top','all',728,90],
  ['ARTICLE_TOP','Article page top','all',728,90],
  ['ARTICLE_MIDDLE','Article page middle','all',728,90],
  ['ARTICLE_BOTTOM','Article page bottom','all',728,90],
  ['ARTICLE_SIDEBAR_TOP','Article side — top','desktop',300,250],
  ['ARTICLE_SIDEBAR_BOTTOM','Article side — bottom','desktop',300,250],
  ['MOBILE_STICKY','Mobile bottom banner','mobile',320,50],
];

function normalizeAd(body){
  const name=String(body.name||'').trim();
  const advertiser=String(body.advertiser||'').trim();
  const creativeUrl=String(body.creative_url||'').trim();
  const targetUrl=String(body.target_url||'').trim();
  const positionId=Number(body.position_id);
  const status=body.status||'draft';
  const allowedStatuses=['draft','active','paused','ended'];
  if(!name||name.length>160) return {error:'Ad name is required and must be under 160 characters.'};
  if(advertiser.length>180) return {error:'Advertiser name must be under 180 characters.'};
  if(!Number.isInteger(positionId)||positionId<1) return {error:'Choose an ad placement.'};
  if(!creativeUrl||creativeUrl.length>500) return {error:'An image URL is required (upload an image or paste a URL).'};
  if(!allowedStatuses.includes(status)) return {error:'Choose a valid ad status.'};
  for(const [field,value] of [['Image URL',creativeUrl],['Click-through URL',targetUrl]]){
    if(!value) continue;
    try { const url=new URL(value); if(!['http:','https:'].includes(url.protocol)||url.username||url.password) throw new Error(); }
    catch { return {error:`${field} must be a valid HTTP(S) URL.`}; }
  }
  function dateValue(value,label){
    if(!value) return null;
    const text=String(value);
    if(!Number.isFinite(new Date(text).getTime())) throw new Error(`${label} must be a valid date.`);
    return text.replace('T',' ').slice(0,19).padEnd(19,':00');
  }
  let startAt,endAt;
  try { startAt=dateValue(body.start_at,'Start date'); endAt=dateValue(body.end_at,'End date'); }
  catch(error){ return {error:error.message}; }
  if(startAt&&endAt&&new Date(startAt.replace(' ','T'))>new Date(endAt.replace(' ','T'))) return {error:'End date must be after start date.'};
  return {data:{name,advertiser:advertiser||null,positionId,creativeUrl,targetUrl:targetUrl||null,status,startAt,endAt}};
}

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

router.get('/categories',asyncHandler(async(_req,res)=>{
  const [rows]=await pool.query(`SELECT c.id,c.name,c.slug,c.description,c.display_order,c.is_active,
    (SELECT COUNT(*) FROM articles a WHERE a.category_id=c.id) article_count
    FROM categories c ORDER BY c.display_order,c.name`);
  res.json({success:true,data:rows});
}));

function normalizeCategory(body){
  const name=String(body.name||'').trim();
  const description=String(body.description||'').trim();
  const displayOrder=Number(body.display_order||0);
  if(!name||name.length>120) return {error:'Category name is required and must be under 120 characters.'};
  if(description.length>2000) return {error:'Description must be under 2,000 characters.'};
  if(!Number.isInteger(displayOrder)||displayOrder<0||displayOrder>100000) return {error:'Display order must be a whole number from 0 to 100,000.'};
  return {data:{name,slug:slugify(name),description:description||null,displayOrder,isActive:body.is_active!==false&&body.is_active!==0}};
}

router.post('/categories',asyncHandler(async(req,res)=>{
  const result=normalizeCategory(req.body||{});
  if(result.error) return res.status(400).json({success:false,message:result.error});
  const category=result.data;
  const id=randomUUID();
  await pool.query('INSERT INTO categories(id,name,slug,description,display_order,is_active) VALUES(?,?,?,?,?,?)',[id,category.name,category.slug,category.description,category.displayOrder,category.isActive]);
  res.status(201).json({success:true,data:{id}});
}));

router.put('/categories/:id',asyncHandler(async(req,res)=>{
  const result=normalizeCategory(req.body||{});
  if(result.error) return res.status(400).json({success:false,message:result.error});
  const category=result.data;
  const [updated]=await pool.query('UPDATE categories SET name=?,slug=?,description=?,display_order=?,is_active=? WHERE id=?',[category.name,category.slug,category.description,category.displayOrder,category.isActive,req.params.id]);
  if(!updated.affectedRows) return res.status(404).json({success:false,message:'Category not found.'});
  res.json({success:true,data:{id:req.params.id}});
}));

router.delete('/categories/:id',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query('SELECT id,is_active FROM categories WHERE id=?',[req.params.id]);
  if(!rows.length) return res.status(404).json({success:false,message:'Category not found.'});
  const [[count]]=await pool.query('SELECT COUNT(*) total FROM articles WHERE category_id=?',[req.params.id]);
  if(Number(count.total)>0){
    await pool.query('UPDATE categories SET is_active=0 WHERE id=?',[req.params.id]);
    return res.json({success:true,data:{deleted:false,archived:true},message:'Category is hidden from the site because articles still use it. Reassign those articles to permanently delete it.'});
  }
  await pool.query('DELETE FROM categories WHERE id=?',[req.params.id]);
  res.json({success:true,data:{deleted:true}});
}));

router.get('/revisions/:articleId',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT r.id,r.title,r.summary,r.change_note,r.created_at,u.name editor_name FROM article_revisions r JOIN users u ON u.id=r.editor_id WHERE r.article_id=? ORDER BY r.created_at DESC LIMIT 50`,[req.params.articleId]);
  res.json({success:true,data:rows});
}));

router.get('/articles/:id',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query('SELECT * FROM articles WHERE id=? LIMIT 1',[req.params.id]);
  if (!rows.length) return res.status(404).json({success:false,message:'Article not found'});
  res.json({success:true,data:rows[0]});
}));

router.get('/users',allowRoles('admin','super_admin'),asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 200`);
  res.json({success:true,data:rows});
}));

router.patch('/users/:id/role',allowRoles('super_admin'),asyncHandler(async(req,res)=>{
  const allowed=['reader','reporter','editor','admin'];
  if(!allowed.includes(req.body.role)) return res.status(400).json({success:false,message:'Invalid role'});
  await pool.query('UPDATE users SET role=?,token_version=token_version+1 WHERE id=?',[req.body.role,req.params.id]);
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

router.get('/ad-positions',allowRoles('admin','super_admin'),asyncHandler(async(_req,res)=>{
  await pool.query('INSERT IGNORE INTO ad_positions(code,name,device,width,height) VALUES ?', [adPositions]);
  const [rows]=await pool.query('SELECT id,code,name,device,width,height FROM ad_positions ORDER BY id');
  res.json({success:true,data:rows});
}));

router.post('/ads',allowRoles('admin','super_admin'),asyncHandler(async(req,res)=>{
  const result=normalizeAd(req.body||{});
  if(result.error) return res.status(400).json({success:false,message:result.error});
  const ad=result.data;
  const [positions]=await pool.query('SELECT id FROM ad_positions WHERE id=?',[ad.positionId]);
  if(!positions.length) return res.status(400).json({success:false,message:'Choose a valid ad placement.'});
  const id=randomUUID();
  await pool.query(`INSERT INTO advertisements(id,name,advertiser,position_id,creative_url,target_url,ad_type,status,start_at,end_at)
    VALUES(?,?,?,?,?,?,'direct',?,?,?)`,[id,ad.name,ad.advertiser,ad.positionId,ad.creativeUrl,ad.targetUrl,ad.status,ad.startAt,ad.endAt]);
  res.status(201).json({success:true,data:{id}});
}));

router.put('/ads/:id',allowRoles('admin','super_admin'),asyncHandler(async(req,res)=>{
  const result=normalizeAd(req.body||{});
  if(result.error) return res.status(400).json({success:false,message:result.error});
  const ad=result.data;
  const [positions]=await pool.query('SELECT id FROM ad_positions WHERE id=?',[ad.positionId]);
  if(!positions.length) return res.status(400).json({success:false,message:'Choose a valid ad placement.'});
  const [updated]=await pool.query(`UPDATE advertisements SET name=?,advertiser=?,position_id=?,creative_url=?,target_url=?,status=?,start_at=?,end_at=? WHERE id=?`,
    [ad.name,ad.advertiser,ad.positionId,ad.creativeUrl,ad.targetUrl,ad.status,ad.startAt,ad.endAt,req.params.id]);
  if(!updated.affectedRows) return res.status(404).json({success:false,message:'Ad not found.'});
  res.json({success:true,data:{id:req.params.id}});
}));

module.exports=router;
