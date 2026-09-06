require('dotenv').config({path: process.env.ENV_FILE || '../../.env'});
const bcrypt=require('bcryptjs');
const {randomUUID}=require('crypto');
const pool=require('../config/db');

(async()=>{
  const [name,email,password]=process.argv.slice(2);
  if(!name||!email||!password||password.length<8){console.log('Usage: npm --workspace apps/api run create-admin -- "Admin Name" admin@example.com StrongPassword');process.exit(1)}
  try{
    const hash=await bcrypt.hash(password,12);
    await pool.query(`INSERT INTO users(id,name,email,password_hash,role,status,email_verified_at) VALUES(?,?,?,?, 'super_admin','active',NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role='super_admin',status='active'`,[randomUUID(),name,email.toLowerCase(),hash]);
    console.log(`✅ Super admin ready: ${email.toLowerCase()}`);
  }catch(e){console.error('❌',e.message);process.exitCode=1}finally{await pool.end()}
})();
