'use strict';

const express      = require('express');
const router       = express.Router();
const analyzeRoute = require('./analyze');

// GET /api/stats — includes last 100 scan log entries
router.get('/', (req, res) => {
  const s   = analyzeRoute.stats;
  const log = analyzeRoute.scanHistory;

  res.status(200).json({
    ok          : true,
    startedAt   : s.startedAt,
    uptime      : Math.floor(process.uptime()),
    totalScans  : s.totalScans,
    successScans: s.successScans,
    errorScans  : s.errorScans,
    ripDetected : s.ripDetected,
    successRate : s.totalScans ? ((s.successScans / s.totalScans) * 100).toFixed(1) + '%' : 'n/a',
    ripRate     : s.successScans ? ((s.ripDetected / s.successScans) * 100).toFixed(1) + '%' : 'n/a',
    memoryMB    : (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
    scanLog     : log,   // real scan history array
  });
});

module.exports = router;
