'use strict';

const express              = require('express');
const { v4: uuidv4 }       = require('uuid');
const { validateImage }    = require('../utils/validateImage');
const { analyzeFrame }     = require('../utils/anthropic');
const { dailyScanLimit } = require('../middleware/rateLimiter');

const router = express.Router();

// ── In-memory stats ───────────────────────────────────────────────────────────
const stats = {
  totalScans   : 0,
  successScans : 0,
  errorScans   : 0,
  ripDetected  : 0,
  startedAt    : new Date().toISOString(),
};

// ── In-memory scan log — last 100 scans ──────────────────────────────────────
const scanHistory = [];
const MAX_HISTORY = 100;

function addToHistory(entry) {
  scanHistory.unshift(entry);          // newest first
  if (scanHistory.length > MAX_HISTORY) scanHistory.pop();
}

// POST /api/analyze
router.post(
  '/',
  dailyScanLimit,
  async (req, res, next) => {
    const scanId    = uuidv4();
    const startedAt = Date.now();
    stats.totalScans += 1;

    try {
      const { imageData, mediaType = 'image/jpeg', sessionId } = req.body;

      const validation = validateImage({ imageData, mediaType });
      if (!validation.valid) {
        return res.status(400).json({ ok: false, error: validation.error });
      }

      const result = await analyzeFrame(imageData, mediaType);

      if (res.locals.incrementScanCount) res.locals.incrementScanCount();

      stats.successScans += 1;
      if ((result.score || 0) >= 46) stats.ripDetected += 1;

      const durationMs = Date.now() - startedAt;

      // ── Record to history ─────────────────────────────────────────────────
      addToHistory({
        scanId,
        time      : new Date().toISOString(),
        tier      : result.tier   || 'low',
        score     : result.score  || 0,
        summary   : (result.summary || '').split('.')[0] + '.',  // first sentence only
        durationMs,
        sessionId : sessionId || 'unknown',
        ip        : (req.ip || '').replace('::ffff:','').slice(0,15),
      });

      console.log(`[SCAN] id=${scanId} score=${result.score} tier=${result.tier} ip=${req.ip} ${durationMs}ms`);

      return res.status(200).json({
        ok        : true,
        scanId,
        result,
        remaining : res.locals.scanCountRemaining,
        durationMs,
      });

    } catch (err) {
      stats.errorScans += 1;

      // Record error to history too
      addToHistory({
        scanId,
        time      : new Date().toISOString(),
        tier      : 'error',
        score     : 0,
        summary   : err.message || 'Scan failed',
        durationMs: Date.now() - startedAt,
        sessionId : req.body?.sessionId || 'unknown',
        ip        : (req.ip || '').replace('::ffff:','').slice(0,15),
      });

      console.error(`[SCAN ERROR] id=${scanId} ip=${req.ip}`, err.message);
      if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
      next(err);
    }
  }
);

module.exports = router;
module.exports.stats       = stats;
module.exports.scanHistory = scanHistory;
