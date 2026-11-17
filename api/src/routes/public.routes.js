const router=require('express').Router();
const {randomUUID}=require('crypto');
const pool=require('../config/db');
const asyncHandler=require('../utils/asyncHandler');
const rateLimit=require('../middleware/rateLimit');

const translationLanguages=new Set(['en','as','bn','brx','doi','gu','hi','kn','ks','gom','mai','ml','mni-Mtei','mr','ne','or','pa','sa','sat','sd','ta','te','ur']);
const googleUnsupportedLanguages=new Set(['brx','ks','sat']);

router.get('/categories',asyncHandler(async(_req,res)=>{
  const [rows]=await pool.query('SELECT id,name,slug,parent_id,description FROM categories WHERE is_active=1 ORDER BY display_order,name');
  res.json({success:true,data:rows});
}));

router.get('/epapers',asyncHandler(async(req,res)=>{
  const requestedLimit=Number(req.query.limit||30);
  const limit=Number.isSafeInteger(requestedLimit)&&requestedLimit>0?Math.min(100,requestedLimit):30;
  const [rows]=await pool.query('SELECT * FROM epapers WHERE is_published=1 ORDER BY edition_date DESC LIMIT ?',[limit]);
  res.json({success:true,data:rows});
}));

router.get('/ads/:position',asyncHandler(async(req,res)=>{
  const [rows]=await pool.query(`SELECT a.*,p.code position_code FROM advertisements a JOIN ad_positions p ON p.id=a.position_id WHERE p.code=? AND a.status='active' AND (a.start_at IS NULL OR a.start_at<=NOW()) AND (a.end_at IS NULL OR a.end_at>=NOW()) ORDER BY a.created_at DESC LIMIT 1`,[req.params.position]);
  res.json({success:true,data:rows[0]||null});
}));

router.post('/translate',rateLimit({windowMs:60000,max:20}),asyncHandler(async(req,res)=>{
  const {language,texts}=req.body||{};
  if(!translationLanguages.has(language)) return res.status(400).json({success:false,message:'Choose a supported language.'});
  if(googleUnsupportedLanguages.has(language)) return res.status(422).json({success:false,message:'Google Cloud Translation currently does not support this language. Choose another language.'});
  if(!Array.isArray(texts)||!texts.length||texts.length>50||texts.some(text=>typeof text!=='string'||!text.trim()||text.length>5000)||texts.reduce((sum,text)=>sum+text.length,0)>20000){
    return res.status(400).json({success:false,message:'Translation request is too large. Please try a shorter page section.'});
  }
  const apiKey=process.env.GOOGLE_TRANSLATE_API_KEY;
  if(!apiKey) return res.status(503).json({success:false,message:'In-page translation needs a Google Cloud Translation API key. Set GOOGLE_TRANSLATE_API_KEY in the API .env file.'});
  const endpoint=new URL('https://translation.googleapis.com/language/translate/v2');
  endpoint.searchParams.set('key',apiKey);
  let response;
  try {
    response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:texts,target:language,format:'text'}),signal:AbortSignal.timeout(20000)});
  } catch {
    return res.status(502).json({success:false,message:'The translation service could not be reached. Please try again.'});
  }
  const result=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(result?.data?.translations)){
    const status=response.status===429?429:502;
    return res.status(status).json({success:false,message:response.status===429?'Translation limit reached. Please wait and try again.':'Google Cloud Translation rejected the request. Check the API key, API access, and billing settings.'});
  }
  res.json({success:true,data:{translations:result.data.translations.map(item=>item.translatedText)}});
}));

router.post('/newsletter',asyncHandler(async(req,res)=>{
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  if(email.length>190||!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({success:false,message:'Valid email required'});
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
  const type=req.body?.event_type;
  if(!['impression','click'].includes(type)) return res.status(400).json({success:false,message:'Invalid event'});
  await pool.query('INSERT INTO ad_events(advertisement_id,event_type) VALUES(?,?)',[req.params.id,type]);
  res.status(201).json({success:true});
}));

module.exports=router;
