require('dotenv').config({path: process.env.ENV_FILE || '../../.env'});
const app=require('./app');
const pool=require('./config/db');
const port=Number(process.env.PORT||8000);
(async()=>{
  try {
    await pool.query('SELECT 1');
    console.log('✅ MySQL connected');
    app.listen(port,()=>console.log(`🚀 Islami Express API running on http://localhost:${port}`));
    setInterval(async()=>{try{await pool.query("UPDATE articles SET status='published',published_at=COALESCE(published_at,NOW()) WHERE status='scheduled' AND scheduled_at<=NOW()")}catch(e){console.error('Scheduler:',e.message)}},60000).unref();
  } catch(err) {
    console.error('❌ Database connection failed:',err.message);
    process.exit(1);
  }
})();
