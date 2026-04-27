'use strict';

const path = require('path');

// Load .env using absolute path — works on cPanel/Passenger and local dev
try {
  const result = require('dotenv').config({ path: path.join(__dirname, '.env') });
  if (result.error) console.log('[startup] No .env file found — using environment variables');
  else console.log('[startup] .env loaded');
} catch(e) { console.log('[startup] dotenv not available'); }

// Store API key globally as belt-and-suspenders for cPanel Passenger
const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
global.ANTHROPIC_API_KEY = apiKey;
if (apiKey && !apiKey.startsWith('sk-ant-your')) {
  console.log('✅  API key loaded, prefix:', apiKey.slice(0, 18) + '...');
} else {
  console.error('❌  ANTHROPIC_API_KEY missing — add it to .env or server environment');
}

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');

const { globalRateLimiter } = require('./middleware/rateLimiter');
const { validateApiKey }    = require('./middleware/auth');
const analyzeRouter         = require('./routes/analyze');
const healthRouter          = require('./routes/health');
const statsRouter           = require('./routes/stats');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(morgan('combined'));
app.use(globalRateLimiter);

// Static frontend
const staticDir = path.join(__dirname, 'public');
app.use('/', express.static(staticDir));
app.use('/ripscan', express.static(staticDir));

// Admin page
app.get(['/admin', '/ripscan/admin'], (req, res) => {
  res.sendFile(path.join(staticDir, 'admin.html'));
});

if (process.env.CLIENT_SECRET) {
  app.use(['/api', '/ripscan/api'], validateApiKey);
}

// API routes — respond on both /api and /ripscan/api for cPanel compatibility
app.use(['/api/health',  '/ripscan/api/health'],  healthRouter);
app.use(['/api/stats',   '/ripscan/api/stats'],   statsRouter);
app.use(['/api/analyze', '/ripscan/api/analyze'], analyzeRouter);

// Debug endpoint
app.get(['/api/debug', '/ripscan/api/debug'], (req, res) => {
  res.json({
    hasKey     : !!(process.env.ANTHROPIC_API_KEY || global.ANTHROPIC_API_KEY),
    keyPrefix  : (process.env.ANTHROPIC_API_KEY || global.ANTHROPIC_API_KEY || '').slice(0, 16) || 'MISSING',
    nodeVersion: process.version,
    env        : process.env.NODE_ENV || 'not set',
    dirname    : __dirname,
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[ERROR]', err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// cPanel Passenger vs local dev
if (typeof PhusionPassenger !== 'undefined') {
  app.listen('passenger');
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\n✅  RipScan running on http://localhost:${PORT}\n`));
}

module.exports = app;
