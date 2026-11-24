/**
 * server.js
 * Backend server for SaansSaaf - Urban Air Quality Assistant.
 * Uses native Node.js HTTP with gzip compression, in-memory TTL response caching,
 * security headers, and secure server-side Google Gemini API integration.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

/**
 * Load environment variables from .env without external dependencies.
 */
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 64 * 1024; // 64 KB limit for JSON plan requests
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX_ENTRIES = 100;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const COMPRESSIBLE_EXTS = new Set(['.html', '.css', '.js', '.json', '.svg']);

/**
 * Bounded in-memory TTL cache for generated plans to reduce latency and API quota usage.
 */
class PlanCache {
  constructor(maxEntries = CACHE_MAX_ENTRIES, ttlMs = CACHE_TTL_MS) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  buildKey({ city, members, transport, homeType, aqi, language }) {
    const normalizedMembers = [...members].sort().join(',');
    const aqiBucket = Math.floor(aqi / 25) * 25;
    return `${city.toLowerCase()}|${normalizedMembers}|${transport}|${homeType}|${aqiBucket}|${language}`;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear() {
    this.store.clear();
  }
}

const planCache = new PlanCache();

/**
 * Send a JSON response with consistent headers.
 */
function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    ...extraHeaders
  });
  res.end(body);
}

/**
 * Read and parse a JSON request body with strict byte-size enforcement.
 */
function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on('data', chunk => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        const err = new Error('Payload Too Large');
        err.statusCode = 413;
        req.destroy();
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const err = new Error('Invalid JSON payload');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

/**
 * Validate and sanitize incoming plan request parameters.
 */
function sanitizePlanRequest(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Invalid request body', message: 'Sahi request data bhejein.' };
  }

  const city = typeof data.city === 'string' ? data.city.trim().slice(0, 80) : '';
  if (!city) {
    return { error: 'City is required', message: 'Kripya shehar ka naam darj karein.' };
  }

  const numericAqi = Number(data.aqi);
  if (!Number.isFinite(numericAqi) || numericAqi < 0 || numericAqi > 999) {
    return { error: 'Invalid AQI', message: 'Sahi AQI number darj karein (0-999).' };
  }

  const allowedMembers = new Set(['children', 'elderly', 'asthma', 'pets']);
  const members = Array.isArray(data.members)
    ? data.members.filter(m => typeof m === 'string' && allowedMembers.has(m))
    : [];

  const transport = typeof data.transport === 'string' ? data.transport.trim().slice(0, 40) : 'public_transit';
  const homeType = typeof data.homeType === 'string' ? data.homeType.trim().slice(0, 40) : 'lowrise_apt';
  const language = data.language === 'en' ? 'en' : 'hi';

  return {
    value: {
      city,
      members,
      transport,
      homeType,
      aqi: Math.round(numericAqi),
      language
    }
  };
}

function hasActiveGeminiKey() {
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '' && GEMINI_API_KEY !== 'your_gemini_api_key_here');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle API POST request for Plan Generation.
 */
async function handleGeneratePlan(req, res) {
  try {
    const rawBody = await readJsonBody(req);
    const sanitized = sanitizePlanRequest(rawBody);

    if (sanitized.error) {
      return sendJson(res, 400, { error: sanitized.error, message: sanitized.message });
    }

    const params = sanitized.value;
    const cacheKey = planCache.buildKey(params);
    const cached = planCache.get(cacheKey);
    if (cached) {
      return sendJson(res, 200, cached, { 'X-Cache': 'HIT' });
    }

    if (hasActiveGeminiKey()) {
      try {
        const { plan: aiPlan, model: successfulModel } = await callGeminiAPI(params);
        aiPlan.source = `gemini (${successfulModel})`;
        aiPlan.model = successfulModel;
        planCache.set(cacheKey, aiPlan);
        console.log(`\n🎉 Plan successfully generated via Gemini API [Model: ${successfulModel}]!`);
        return sendJson(res, 200, aiPlan, { 'X-Cache': 'MISS' });
      } catch (apiErr) {
        console.error('\n======================================================');
        console.error('❌ ALL GEMINI CANDIDATE MODELS FAILED - FULL ERROR:');
        console.error(apiErr);
        if (apiErr.stack) console.error('Stack Trace:', apiErr.stack);
        if (apiErr.responseBody) console.error('API Response Body:', apiErr.responseBody);
        console.error('======================================================\n');
      }
    } else {
      console.info('ℹ️ Note: GEMINI_API_KEY not configured in .env. Using built-in SaansSaaf expert engine.');
    }

    console.log('🛡️ Activating expert rule-based fallback plan...');
    const fallbackPlan = generateExpertFallbackPlan(params);
    fallbackPlan.source = 'fallback';
    fallbackPlan.model = 'rule-based engine';
    planCache.set(cacheKey, fallbackPlan);
    return sendJson(res, 200, fallbackPlan, { 'X-Cache': 'MISS' });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error('Request error:', err);
    return sendJson(res, status, { error: err.message || 'Internal Server Error', message: err.message });
  }
}

/**
 * Build the structured Gemini prompt for a family's AQI profile.
 */
function buildGeminiPrompt({ city, members, transport, homeType, aqi, language }) {
  const langPrompt = language === 'hi'
    ? 'The response MUST be written in conversational, easy-to-understand Hindi (Devanagari script with common Indian terms).'
    : 'The response MUST be written in clear, concise English.';

  return `
You are the AI engine for "SaansSaaf", an Urban Air Quality & Winter Smog Assistant for families in smog-hit Indian cities.

USER CONTEXT:
- City: ${city}
- Current AQI: ${aqi} (Air Quality Index)
- Household Vulnerable Members: ${members.length > 0 ? members.join(', ') : 'None specified'}
- Primary Daily Commute: ${transport}
- Home Architecture: ${homeType}
- Target Language: ${language} (${langPrompt})

TASK:
Generate a personalized, medically-safe daily action plan tailored to this family's specific commute, home layout, and vulnerable family members (especially children, seniors, or asthma sufferers).
Divide your response into three core sections:
(a) Low-emission daily routine: Safe outdoor time windows, commute shift advice, morning smog avoidance.
(b) Indoor air quality hacks: Actionable particulate reduction without needing expensive purifiers (e.g. damp mopping, sealing windows during smog peak, exhaust usage, DIY filters).
(c) Sustainable alternatives: Long-term and daily choices that cut household emissions and local pollution.
Also provide an Impact Meter with rough scientific estimates (exposure reduction %, daily emissions avoided, family safety summary).

OUTPUT FORMAT:
Respond with ONLY valid JSON matching this schema without markdown backticks:
{
  "impact": {
    "exposureReduction": "-45% se -65%",
    "exposureBarPercent": "65%",
    "emissionsSaved": "~2.6 kg CO2e",
    "emissionsBarPercent": "70%",
    "healthRating": "High Protection",
    "vulnerableSummary": "Children and Elderly shielded from peak smog"
  },
  "sectionA": {
    "title": "Low-Emission Daily Routine",
    "impactChipExp": "-55% Peak Commute Inhalation",
    "impactChipEmi": "Carpool & Transit Footprint Savings",
    "items": [{ "icon": "⏰", "title": "...", "description": "...", "impact": "..." }]
  },
  "sectionB": {
    "title": "Indoor Air Quality Hacks",
    "impactChipExp": "-40% Indoor PM2.5 Infiltration",
    "impactChipEmi": "Zero-Electricity Natural Hacks",
    "items": [{ "icon": "🧹", "title": "...", "description": "...", "impact": "..." }]
  },
  "sectionC": {
    "title": "Sustainable Alternatives",
    "impactChipExp": "Cleaner Neighborhood Air",
    "impactChipEmi": "Low Household Carbon Footprint",
    "items": [{ "icon": "🚲", "title": "...", "description": "...", "impact": "..." }]
  }
}`;
}

/**
 * Call Google Gemini API with candidate model fallback and retry logic.
 */
async function callGeminiAPI(params) {
  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash'
  ];

  const requestPayload = {
    contents: [{ parts: [{ text: buildGeminiPrompt(params) }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  };

  let lastError = null;
  const maxRetries = 2;

  for (const modelName of candidateModels) {
    console.log(`\n🔄 Attempting Gemini API with model: ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const err = new Error(`Gemini API Error with ${modelName} (HTTP ${response.status}): ${errorText}`);
          err.status = response.status;
          err.responseBody = errorText;
          err.model = modelName;
          lastError = err;

          if (response.status === 404) {
            console.warn(`❌ Model ${modelName} returned 404. Moving to next candidate model.`);
            break;
          }

          if (response.status === 503 || response.status === 429) {
            console.warn(`⚠️ Model ${modelName} returned HTTP ${response.status} (attempt ${attempt}/${maxRetries + 1}).`);
            if (attempt <= maxRetries) {
              await sleep(1500);
              continue;
            }
            console.warn(`❌ Model ${modelName} exhausted retries for HTTP ${response.status}.`);
            break;
          }

          console.warn(`⚠️ Model ${modelName} returned HTTP ${response.status}: ${errorText}`);
          break;
        }

        const result = await response.json();
        const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) {
          throw new Error(`Empty response from Gemini API (${modelName})`);
        }

        const cleaned = textOutput.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
        return { plan: JSON.parse(cleaned), model: modelName };
      } catch (fetchErr) {
        lastError = fetchErr;
        const isTimeout = fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError';
        const isRetryableStatus = fetchErr.status === 503 || fetchErr.status === 429;

        if ((isTimeout || isRetryableStatus) && attempt <= maxRetries) {
          console.warn(`⏳ Retryable error for ${modelName} (attempt ${attempt}/${maxRetries + 1}): ${fetchErr.message}`);
          await sleep(1500);
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
}

/**
 * Expert Rule-Based Plan Generator (Local Intelligent Fallback).
 */
function generateExpertFallbackPlan({ members = [], transport, homeType, aqi, language }) {
  const isHi = language === 'hi';
  const hasKids = members.includes('children');
  const hasElderly = members.includes('elderly');
  const hasAsthma = members.includes('asthma');

  let expReduction = isHi ? '-45% se -60%' : '-45% to -60%';
  let barPercent = '65%';
  let emissionSaved = '~2.4 kg CO₂e';
  let emissionPercent = '68%';

  if (aqi > 300) {
    expReduction = isHi ? '-55% se -70%' : '-55% to -70%';
    barPercent = '75%';
    emissionSaved = '~3.1 kg CO₂e';
    emissionPercent = '80%';
  } else if (aqi < 150) {
    expReduction = isHi ? '-25% se -40%' : '-25% to -40%';
    barPercent = '45%';
    emissionSaved = '~1.8 kg CO₂e';
    emissionPercent = '50%';
  }

  const healthRating = isHi ? 'Uchch Suraksha (High Protection)' : 'High Protection Protocol';
  const activeGroups = [
    hasKids && (isHi ? 'Bachche' : 'Children'),
    hasElderly && (isHi ? 'Buzurg' : 'Seniors'),
    hasAsthma && (isHi ? 'Asthma Rogi' : 'Respiratory patients')
  ].filter(Boolean);

  const vulnerableSummary = isHi
    ? `${activeGroups.length ? activeGroups.join(', ') : 'Sabhi sadasyon'} ke liye targeted bachaav`
    : `Targeted shielding for ${activeGroups.length ? activeGroups.join(', ') : 'All members'}`;

  const isOpenCommute = transport === 'two_wheeler' || transport === 'walk_cycle';

  const routineItems = isHi ? [
    {
      icon: '⏰',
      title: 'Bahar Nikalne Ka Safe Window (12:00 PM - 4:00 PM)',
      description: `Subah 6 se 9 baje winter smog aur inversion sabse zyada rehta hai. Zaroori bahar ke kaam dopahar mein karein jab dhoop se hawa thodi saaf hoti hai.${hasAsthma ? ' Asthma sadasya subah bilkul bahar na niklein.' : ''}`,
      impact: 'Peak PM2.5 inhalation mein ~50% ki kami'
    },
    {
      icon: '🚇',
      title: 'Commute Modification & Mask Protocol',
      description: isOpenCommute
        ? `Aap ${transport === 'two_wheeler' ? 'bike/scooter' : 'cycle/walk'} se travel karte hain jo open-air hai. Smog season mein Metro ya AC Bus use karein ya double-sealed N95 mask zaroor pehnein.`
        : 'Closed car ya public transit mein recirculation mode on rakhein taaki bahar ka dhuan andar na aaye.',
      impact: 'Personal emissions mein ~1.8 kg bachat aur 45% kam exposure'
    },
    {
      icon: '🏫',
      title: 'Ghar ke Sadasyo ki Suraksha Timing',
      description: hasKids
        ? 'Bachchon ki outdoor physical training ya khel-kood dopehar ya ghar ke andar shift karein.'
        : 'Outdoor running/jogging ke bajaye indoor yoga ya light stretching karein.',
      impact: 'Fephadon par toxic particle deposition mein bhari kami'
    }
  ] : [
    {
      icon: '⏰',
      title: 'Safe Outdoor Window (12:00 PM - 4:00 PM)',
      description: `Morning hours (6 AM - 10 AM) experience severe winter thermal inversion trapping toxic particulate matter. Conduct necessary outdoor tasks in the afternoon.${hasAsthma ? ' Respiratory patients should strictly avoid morning air.' : ''}`,
      impact: 'Cuts toxic particulate inhalation by ~50%'
    },
    {
      icon: '🚇',
      title: 'Commute & Travel Safeguards',
      description: isOpenCommute
        ? 'Two-wheeler and pedestrian transit exposes you to direct tailpipe emissions. Shift to Metro/bus or strictly don an N95 certified respirator.'
        : 'Keep vehicle ventilation on internal recirculation mode to block external exhaust.',
      impact: 'Saves ~1.8 kg commute emissions & shields airways'
    },
    {
      icon: '🏫',
      title: 'Activity Schedule Adjustment',
      description: hasKids
        ? 'Restrain children from early morning outdoor sports; switch to indoor activities.'
        : 'Replace outdoor jogging with indoor bodyweight or yoga exercises during smog peaks.',
      impact: 'Minimizes deep lung penetration of PM2.5'
    }
  ];

  const indoorItems = isHi ? [
    {
      icon: '🧹',
      title: 'Geela Poncha (Damp Mopping) vs Sookhi Jhadu',
      description: 'Sookhi jhadu lagane se particulate matter hawa mein do-bara udne lagta hai. Din mein 2 baar geela poncha lagayein jismein thoda namak ya neem water mila sakte hain.',
      impact: 'Indoor dhool aur particulates mein ~35% kami'
    },
    {
      icon: '🪟',
      title: 'Khidkiyon ki Sealing & Ventilation Window',
      description: homeType === 'highrise_apt'
        ? 'High-rise floors par hawa tez hoti hai. Shaam 5 baje se subah 10 baje tak sabhi khidkiyan band rakhein. Dopehar 1 se 3 baje 20 minute ke liye cross-ventilation karein.'
        : 'Ground floor aur main road ke paas darwazon ke neeche geela kapda ya draft stopper lagayein taaki vehicular smog andar na ghuse.',
      impact: 'Ghar ke andar ka AQI bahar se 30-40% behtar rehta hai'
    },
    {
      icon: '🍳',
      title: 'Kitchen Smoke & Incense Control',
      description: 'Khana banate waqt exhaust fan ya chimney zaroor chalayein. Smog ke dino mein agarbatti, dhoopbatti ya machhar wali coil na jalayein.',
      impact: 'Indoor VOCs aur toxic carbon monoxide mein 70% girawat'
    }
  ] : [
    {
      icon: '🧹',
      title: 'Damp Mopping Protocol',
      description: 'Dry sweeping resuspends deposited toxic particles back into breathing zones. Switch strictly to wet damp-mopping twice daily.',
      impact: 'Lowers indoor resuspended dust by ~35%'
    },
    {
      icon: '🪟',
      title: 'Airtight Sealing & Strategic Ventilation',
      description: homeType === 'highrise_apt'
        ? 'Seal exterior balconies between 5 PM and 10 AM. Ventilate briefly only between 1 PM and 3 PM when solar mixing dilutes ground pollutants.'
        : 'Install door gap draft stoppers at ground level entryways to block heavy road dust ingress.',
      impact: 'Maintains indoor air 30-40% cleaner than outdoor baseline'
    },
    {
      icon: '🍳',
      title: 'Kitchen & Combustion Mitigation',
      description: 'Run kitchen exhaust during all cooking. Avoid burning incense sticks (agarbatti), mosquito coils, or decorative candles inside.',
      impact: 'Eliminates up to 70% of indoor volatile organics and soot'
    }
  ];

  const sustainableItems = isHi ? [
    {
      icon: '🛒',
      title: 'Combined Errands & Local Zero-Emission Trips',
      description: 'Chhoti-moti cheezon ke liye baar-baar gadi nikalne ke bajaye hafte ki zarooratein ek trip mein lein, ya battery rickshaw/cycle rickshaw use karein.',
      impact: 'Direct vehicle emissions mein ~2.5 kg CO₂e ki bachat'
    },
    {
      icon: '🔥',
      title: 'Biomass & Waste Burning ka Vikalp',
      description: 'Sardi ke liye aag ya kooda jalane ke bajaye thermal layering aur warm clothing pehnein. Apni society mein security guards ko electric room heater ya warm jackets provide karein.',
      impact: 'Local toxic smoke aur black carbon emissions par seedhi rok'
    },
    {
      icon: '🌿',
      title: 'Low-Maintenance Air-Purifying Indoor Plants',
      description: 'Snake Plant (Sansevieria), Areca Palm aur Money Plant ghar ke kono mein rakhein. Yeh raat mein bhi oxygen release karte hain aur toxics absorb karte hain.',
      impact: 'Zero electricity cost ke saath indoor freshness'
    }
  ] : [
    {
      icon: '🛒',
      title: 'Batch Commute & Neighborhood Micro-Transit',
      description: 'Consolidate multiple short vehicle trips into a single shared run or opt for electric auto/rickshaw for neighborhood errands.',
      impact: 'Avoids ~2.5 kg CO₂e of cold-start tailpipe pollution'
    },
    {
      icon: '🔥',
      title: 'Eliminate Open Waste & Heating Fires',
      description: 'Encourage warm thermal blankets and layered clothing instead of open wood/waste bonfires. Support building guards with electric warmers.',
      impact: 'Prevents direct community release of toxic soot and dioxins'
    },
    {
      icon: '🌿',
      title: 'Natural Bio-Filtration Plants',
      description: 'Place Snake Plants, Areca Palms, and Spider Plants in sleeping quarters for natural VOC filtering with zero electric consumption.',
      impact: 'Zero operating cost, natural humidity and particulate capture'
    }
  ];

  return {
    impact: {
      exposureReduction: expReduction,
      exposureBarPercent: barPercent,
      emissionsSaved: emissionSaved,
      emissionsBarPercent: emissionPercent,
      healthRating,
      vulnerableSummary
    },
    sectionA: {
      title: 'Low-Emission Daily Routine',
      impactChipExp: '-50% Peak Inhalation',
      impactChipEmi: 'Transit Footprint Savings',
      items: routineItems
    },
    sectionB: {
      title: 'Indoor Air Quality Hacks',
      impactChipExp: '-40% Indoor PM2.5',
      impactChipEmi: 'Zero-Electricity Hacks',
      items: indoorItems
    },
    sectionC: {
      title: 'Sustainable Alternatives',
      impactChipExp: 'Cleaner Local Air',
      impactChipEmi: 'Reduced Carbon Footprint',
      items: sustainableItems
    }
  };
}

/**
 * Serve static files from public/ with gzip compression and cache headers.
 */
function serveStaticFile(req, res, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    return res.end('400 Bad Request');
  }

  const relativePath = decodedPath === '/' ? 'index.html' : `.${decodedPath}`;
  const filePath = path.resolve(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheControl = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = COMPRESSIBLE_EXTS.has(ext) && /\bgzip\b/.test(acceptEncoding);

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    };
    if (shouldGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
    }

    res.writeHead(200, headers);
    const readStream = fs.createReadStream(filePath);
    readStream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });

    if (shouldGzip) {
      readStream.pipe(zlib.createGzip()).pipe(res);
    } else {
      readStream.pipe(res);
    }
  });
}

/**
 * Native HTTP Server with security headers, API routing, and static asset delivery.
 */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/generate-plan' && req.method === 'POST') {
    return handleGeneratePlan(req, res);
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'SaansSaaf Air Quality Assistant',
      hasGeminiKey: hasActiveGeminiKey()
    });
  }

  return serveStaticFile(req, res, pathname);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('=======================================================');
    console.log(' 🫁 SaansSaaf - Urban Air Quality Assistant Backend ');
    console.log(` Server is running on: http://localhost:${PORT}`);
    console.log(` Gemini API Status: ${hasActiveGeminiKey() ? '✅ Key Active' : 'ℹ️ Rule-Based Engine Active (Set GEMINI_API_KEY in .env to enable Live AI)'}`);
    console.log('=======================================================');
  });
}

module.exports = {
  server,
  planCache,
  sanitizePlanRequest,
  generateExpertFallbackPlan,
  buildGeminiPrompt
};
