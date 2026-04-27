# 🌊 RipScan — AI Rip Current Detector

Real-time AI-powered rip current detection using your smartphone camera and Claude Vision AI.

**Live at:** https://bigwalt.ai/ripscan

![RipScan](public/ripscan-logo.png)

---

## What it does

Point your phone camera at the ocean surf zone. RipScan uses Claude Vision AI to analyze the image in real time and detect rip current indicators:

- 🟤 Discolored or murky water channels
- 🫧 Foam or debris lines extending seaward  
- 🌀 Choppy turbulent water amid calmer surf
- 〰️ Gaps or breaks in the wave line
- ➡️ Visible seaward water movement

Returns a **0–100% risk score** with color-coded warnings:
- 🟢 **Low** — Safe conditions
- 🟡 **Moderate** — Stay alert
- 🟠 **High** — Caution advised
- 🔴 **Extreme** — Stay out of water

---

## Architecture

```
Phone Browser              Node.js Server           Anthropic API
──────────────────────     ────────────────────      ─────────────
Camera frame (JPEG)    →   POST /ripscan/api/analyze → Claude Vision
                       ←   { score, tier, summary }  ← AI response
```

---

## Project Structure

```
ripscan/
├── server.js                 # Express server entry point
├── package.json
├── .env.example              # Copy to .env and add your API key
├── .htaccess                 # cPanel/Passenger routing config
├── .gitignore                # Keeps secrets out of git
├── middleware/
│   ├── rateLimiter.js        # Rate limiting & daily caps
│   └── auth.js               # Optional client auth
├── routes/
│   ├── analyze.js            # Main scan endpoint + scan history
│   ├── health.js             # Health check endpoint
│   └── stats.js              # Analytics endpoint
├── utils/
│   ├── anthropic.js          # Claude Vision API client
│   └── validateImage.js      # Image validation
└── public/
    ├── index.html            # RipScan app frontend
    ├── admin.html            # Admin dashboard
    └── ripscan-logo.png      # App logo
```

---

## Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/ripscan.git
cd ripscan

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env and add your Anthropic API key

# 4. Run
npm start
# Open http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ripscan/api/health` | Server health check |
| POST | `/ripscan/api/analyze` | Submit camera frame for analysis |
| GET | `/ripscan/api/stats` | Live analytics + scan log |
| GET | `/ripscan/api/debug` | Environment debug info |

### POST /ripscan/api/analyze

**Request:**
```json
{
  "imageData": "<base64 JPEG>",
  "mediaType": "image/jpeg",
  "sessionId": "sess_abc123"
}
```

**Response:**
```json
{
  "ok": true,
  "scanId": "uuid",
  "result": {
    "score": 72,
    "tier": "high",
    "indicators": { "discolor": true, "foam": true, "chop": false, "channel": true, "current": false, "break": true },
    "zones": [{ "x": 0.35, "y": 0.4, "w": 0.18, "h": 0.25, "label": "Rip channel", "risk": "high" }],
    "summary": "A clear rip current channel is visible...",
    "escape": "Swim parallel to shore to escape the current."
  },
  "durationMs": 1840
}
```

---

## Deployment

### cPanel (current)
1. Upload all files to `public_html/ripscan/`
2. Set up Node.js app in cPanel pointing to `server.js`
3. Add `ANTHROPIC_API_KEY` in cPanel environment variables
4. Run NPM Install → Start

### VPS (recommended for production)
```bash
git clone https://github.com/YOUR_USERNAME/ripscan.git
cd ripscan
npm install
cp .env.example .env && nano .env   # add your key
pm2 start server.js --name ripscan
pm2 save
```

### Railway / Render (easiest)
Connect your GitHub repo — they auto-deploy on every push.

---

## Admin Dashboard

Visit `/ripscan/admin` for the password-protected Mission Control dashboard showing:
- Live scan counts and success rates
- Rip detection rate
- Real-time scan log with Claude's summaries
- Server health and memory usage

Default password: set your own in `public/admin.html` line with `ADMIN_PASSWORD`

---

## Security

- API key never exposed to browser — stays on server
- Helmet.js security headers
- CORS locked to configured origins
- Rate limiting: 50 req/15min per IP
- Daily scan cap: 500/day per IP
- Image validation before hitting Anthropic

---

## Disclaimer

For educational use only. Always follow lifeguard instructions. Do not rely solely on this app for beach safety decisions.

---

## Built with

- [Claude Vision API](https://anthropic.com) — AI image analysis
- [Express.js](https://expressjs.com) — Node.js server
- [Cocoa Beach, Florida](https://www.cocoabeachwaves.com) — Inspiration 🌴

---

*Built in one day. May save lives. 🌊*
