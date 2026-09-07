const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function readToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch (_) {}
  next();
}

async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({success:false,message:'Authentication required'});
  let claims;
  try { claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({success:false,message:'Invalid or expired token'}); }
  if (!claims || typeof claims.id !== 'string') return res.status(401).json({success:false,message:'Invalid or expired token'});
  try {
    const [rows] = await pool.query('SELECT id,name,email,role,status FROM users WHERE id=? LIMIT 1', [claims.id]);
    if (!rows[0]) return res.status(401).json({success:false,message:'Account no longer exists'});
    if (rows[0].status !== 'active') return res.status(403).json({success:false,message:'Account is not active'});
    req.user = rows[0];
  } catch (error) { return next(error); }
  next();
}

function allowRoles(...roles) {
  return (req,res,next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({success:false,message:'Permission denied'});
}

module.exports = { optionalAuth, requireAuth, allowRoles };
