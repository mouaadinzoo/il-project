const { getUserBySession } = require('../utils/authStore');

function attachUser(req, _res, next) {
  const token = req.cookies?.wt_session;
  if (!token) {
    req.user = null;
    return next();
  }
  req.user = getUserBySession(token);
  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

module.exports = { attachUser, requireAuth };
