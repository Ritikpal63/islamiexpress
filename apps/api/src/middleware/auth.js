const jwt = require('jsonwebtoken');

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

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({success:false,message:'Authentication required'});
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_) {
    res.status(401).json({success:false,message:'Invalid or expired token'});
  }
}

function allowRoles(...roles) {
  return (req,res,next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({success:false,message:'Permission denied'});
}

module.exports = { optionalAuth, requireAuth, allowRoles };
