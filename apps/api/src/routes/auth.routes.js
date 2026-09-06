const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');

router.post('/register', asyncHandler(async (req,res) => {
  const {name,email,password,phone} = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({success:false,message:'Name, valid email and password (8+ chars) are required'});
  const [exists] = await pool.query('SELECT id FROM users WHERE email=? LIMIT 1',[email.toLowerCase()]);
  if (exists.length) return res.status(409).json({success:false,message:'Email already registered'});
  const id = randomUUID();
  const hash = await bcrypt.hash(password,12);
  await pool.query('INSERT INTO users(id,name,email,phone,password_hash,role,status) VALUES(?,?,?,?,?,\'reader\',\'active\')',[id,name.trim(),email.toLowerCase(),phone||null,hash]);
  const token = jwt.sign({id,name:name.trim(),email:email.toLowerCase(),role:'reader'},process.env.JWT_SECRET,{expiresIn:'7d'});
  res.status(201).json({success:true,token,user:{id,name:name.trim(),email:email.toLowerCase(),role:'reader'}});
}));

router.post('/login', asyncHandler(async (req,res) => {
  const {email,password} = req.body;
  const [rows] = await pool.query('SELECT id,name,email,password_hash,role,status,avatar_url FROM users WHERE email=? LIMIT 1',[(email||'').toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password||'',user.password_hash))) return res.status(401).json({success:false,message:'Invalid email or password'});
  if (user.status !== 'active') return res.status(403).json({success:false,message:'Account is not active'});
  const token = jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'7d'});
  delete user.password_hash;
  res.json({success:true,token,user});
}));

router.get('/me', requireAuth, asyncHandler(async (req,res) => {
  const [rows] = await pool.query('SELECT id,name,email,phone,role,avatar_url,bio,created_at FROM users WHERE id=?',[req.user.id]);
  res.json({success:true,data:rows[0]});
}));

module.exports = router;
