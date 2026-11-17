const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const cookieName = 'ie_session';

function readToken(req) {
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== cookieName) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
  }
  return null;
}

function originAllowed(req) {
  const origin = req.get('origin');
  if (!origin) return false;
  const configured = (process.env.WEB_ORIGIN || process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  return origin === requestOrigin || configured.includes(origin);
}

function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof claims.id !== 'string') return next();
    pool.query('SELECT id,name,email,role,status,token_version FROM users WHERE id=? LIMIT 1', [claims.id])
      .then(([rows]) => {
        const user = rows[0];
        if (user && user.status === 'active' && Number(user.token_version) === claims.token_version) req.user = user;
        next();
      }).catch(next);
  } catch (_) { next(); }
}

async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({success:false,message:'Authentication required'});
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !originAllowed(req)) {
    return res.status(403).json({success:false,message:'Request origin is not allowed'});
  }
  let claims;
  try { claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({success:false,message:'Invalid or expired token'}); }
  if (!claims || typeof claims.id !== 'string') return res.status(401).json({success:false,message:'Invalid or expired token'});
  try {
    const [rows] = await pool.query('SELECT id,name,email,role,status,token_version FROM users WHERE id=? LIMIT 1', [claims.id]);
    if (!rows[0]) return res.status(401).json({success:false,message:'Account no longer exists'});
    if (rows[0].status !== 'active') return res.status(403).json({success:false,message:'Account is not active'});
    if (Number(rows[0].token_version) !== claims.token_version) return res.status(401).json({success:false,message:'Session expired. Please sign in again.'});
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
