'use strict';

function validateApiKey(req, res, next) {
  const secret = process.env.CLIENT_SECRET;
  if (!secret) return next();
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== secret) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

module.exports = { validateApiKey };
