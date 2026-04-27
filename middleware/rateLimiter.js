'use strict';

const rateLimit = require('express-rate-limit');

// ── In-memory daily scan counter per IP ──────────────────────────────────────
const dailyCounters = new Map();

function getDailyCount(ip) {
  const now  = Date.now();
  const data = dailyCounters.get(ip);
  if (!data || now > data.resetAt) {
    const entry = { count: 0, resetAt: startOfNextDay() };
    dailyCounters.set(ip, entry);
    return entry;
  }
  return data;
}

function startOfNextDay() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

// Clean stale entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of dailyCounters) {
    if (now > data.resetAt) dailyCounters.delete(ip);
  }
}, 60 * 60 * 1000);

// ── Global rate limiter — 50 requests per 15 min per IP ──────────────────────
const globalRateLimiter = rateLimit({
  windowMs : parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50,
  standardHeaders: true,
  legacyHeaders  : false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error      : 'Too many requests — please wait before scanning again.',
      retryAfter : Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// ── Per-scan limiter — max 1 scan per 2 seconds per IP ───────────────────────
// Loosened from 3s to 2s to avoid false triggers on slow networks
const scanRateLimiter = rateLimit({
  windowMs : 2000,
  max      : 1,
  standardHeaders: true,
  legacyHeaders  : false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Scanning too fast — please wait a moment.',
      retryAfter: 2,
    });
  },
});

// ── Daily scan cap middleware ─────────────────────────────────────────────────
function dailyScanLimit(req, res, next) {
  const limit = parseInt(process.env.DAILY_SCAN_LIMIT) || 500;
  const entry = getDailyCount(req.ip);

  if (entry.count >= limit) {
    const resetIn = Math.ceil((entry.resetAt - Date.now()) / 1000 / 60);
    return res.status(429).json({
      error      : `Daily scan limit reached (${limit}/day). Resets in ${resetIn} minutes.`,
      dailyLimit : limit,
      resetsInMin: resetIn,
    });
  }

  res.locals.incrementScanCount = () => { entry.count += 1; };
  res.locals.scanCountRemaining  = limit - entry.count;
  next();
}

module.exports = { globalRateLimiter, scanRateLimiter, dailyScanLimit };
