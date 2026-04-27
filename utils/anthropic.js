'use strict';

const https = require('https');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL             = 'claude-sonnet-4-5';
const MAX_TOKENS        = 1024;
const API_VERSION       = '2023-06-01';

const RIP_CURRENT_PROMPT = `You are a coastal safety expert analyzing a live camera image of an ocean/beach scene to detect rip currents.

Respond ONLY with a JSON object (no markdown, no backticks) in exactly this structure:
{
  "score": <0-100 integer>,
  "tier": "<low|moderate|high|extreme>",
  "indicators": {
    "discolor": <true/false>,
    "foam": <true/false>,
    "chop": <true/false>,
    "channel": <true/false>,
    "current": <true/false>,
    "break": <true/false>
  },
  "zones": [{"x":<0-1>,"y":<0-1>,"w":<0-1>,"h":<0-1>,"label":"<text>","risk":"<low|mod|high>"}],
  "summary": "<2-3 sentence assessment>",
  "escape": "<what to do if caught, or N/A>"
}

Score: 0-20=low, 21-45=moderate, 46-70=high, 71-100=extreme.
If not an ocean scene: score=0, all false, zones=[], summary="Point camera at ocean surf zone.", escape="N/A".`;

function getApiKey() {
  return (process.env.ANTHROPIC_API_KEY || global.ANTHROPIC_API_KEY || '').trim();
}

async function analyzeFrame(imageData, mediaType) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.startsWith('sk-ant-your')) {
    const err = new Error('ANTHROPIC_API_KEY not configured on server.');
    err.status = 500;
    throw err;
  }

  const body = JSON.stringify({
    model     : MODEL,
    max_tokens: MAX_TOKENS,
    messages  : [{
      role   : 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
        { type: 'text',  text: RIP_CURRENT_PROMPT },
      ],
    }],
  });

  const raw      = await httpPost(ANTHROPIC_API_URL, body, {
    'Content-Type'     : 'application/json',
    'x-api-key'        : apiKey,
    'anthropic-version': API_VERSION,
  });
  const envelope = JSON.parse(raw);

  if (envelope.error) {
    const msg = envelope.error.message || JSON.stringify(envelope.error);
    const err  = new Error(`Anthropic API error: ${msg}`);
    err.status = envelope.error.type === 'rate_limit_error' ? 429 : 502;
    throw err;
  }

  const text  = (envelope.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); }
  catch { throw new Error('Claude returned non-JSON: ' + clean.slice(0, 200)); }
}

function httpPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
      headers : { ...headers, 'Content-Length': Buffer.byteLength(body) },
      timeout : 30000,
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Anthropic API timed out')); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

module.exports = { analyzeFrame };
