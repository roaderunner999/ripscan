'use strict';
const express = require('express');
const router  = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    ok     : true,
    service: 'RipScan Backend',
    version: '1.2.0',
    uptime : Math.floor(process.uptime()),
    time   : new Date().toISOString(),
  });
});

module.exports = router;
