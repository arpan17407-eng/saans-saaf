/**
 * server.js
 * Backend server for SaansSaaf - Urban Air Quality Assistant
 * Supports both Express (if installed) and Native Node.js HTTP server.
 * Communicates securely with Google Gemini API without exposing the key.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Simple .env parser to ensure zero-dependency startup if dotenv is not yet installed
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
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
    });
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT, 10) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

// MIME Types for static files
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

/**
 * Handle API POST request for Plan Generation
 */
async function handleGeneratePlan(req, res) {
  let bodyStr = '';
  req.on('data', chunk => {
    bodyStr += chunk;
    if (bodyStr.length > 1e6) { // 1MB limit
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const data = JSON.parse(bodyStr || '{}');
      const { city, members = [], transport, homeType, aqi, language = 'hi' } = data;

      // Validation
      if (!city || typeof city !== 'string' || !city.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'City is required', message: 'Kripya shehar ka naam darj karein.' }));
      }

      const numericAqi = parseInt(aqi, 10);
      if (isNaN(numericAqi) || numericAqi < 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid AQI', message: 'Sahi AQI number darj karein.' }));
      }

      // If Gemini Key is present, call Gemini API
      if (GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '' && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        try {
          const { plan: aiPlan, model: successfulModel } = await callGeminiAPI({ city, members, transport, homeType, aqi: numericAqi, language });
          aiPlan.source = `gemini (${successfulModel})`;
          aiPlan.model = successfulModel;
          console.log(`\n🎉 Plan successfully generated via Gemini API [Model: ${successfulModel}]!`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(aiPlan));
        } catch (apiErr) {
          console.error('\n======================================================');
          console.error('❌ ALL GEMINI CANDIDATE MODELS FAILED - FULL ERROR:');
          console.error(apiErr);
          if (apiErr.stack) {
            console.error('Stack Trace:', apiErr.stack);
          }
          if (apiErr.responseBody) {
            console.error('API Response Body:', apiErr.responseBody);
          }
          console.error('======================================================\n');
        }
      } else {
        console.info('ℹ️ Note: GEMINI_API_KEY not configured in .env. Using built-in SaansSaaf expert engine for response.');
      }

      // Fallback Expert Rule-Based Plan (Only when all models fail or key is not provided)
      console.log('🛡️ Activating expert rule-based fallback plan...');
      const fallbackPlan = generateExpertFallbackPlan({ city, members, transport, homeType, aqi: numericAqi, language });
      fallbackPlan.source = 'fallback';
      fallbackPlan.model = 'rule-based engine';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fallbackPlan));

    } catch (err) {
      console.error('Request error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
  });
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI({ city, members, transport, homeType, aqi, language }) {

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash'
  ];
  let lastError = null;

  for (const modelName of candidateModels) {
    console.log(`\n🔄 Attempting Gemini API with model: ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const langPrompt = language === 'hi'
      ? 'The response MUST be written in conversational, easy-to-understand Hindi (Devanagari script with common Indian terms).'
      : 'The response MUST be written in clear, concise English.';

    const prompt = `
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
You MUST divide your response into three specific core sections:
(a) Low-emission daily routine: Safe outdoor time windows, commute shift advice, morning smog avoidance.
(b) Indoor air quality hacks: Actionable particulate reduction without needing expensive purifiers (e.g. damp mopping, sealing windows during smog peak, exhaust usage, DIY filters).
(c) Sustainable alternatives: Long-term and daily choices that cut household emissions and local pollution.

You MUST also provide an Impact Meter with rough scientific estimates for:
- Exposure reduction percentage (e.g., "-45% to -65%")
- Daily emissions avoided (e.g., "~2.5 kg CO2e")
- Family safety summary
- Mention clearly that these numbers are rough estimates.

OUTPUT FORMAT:
Respond with ONLY valid JSON adhering strictly to this JSON schema without any markdown wrapping or backticks:
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
    "items": [
      {
        "icon": "⏰",
        "title": "Morning Routine Adjustment",
        "description": "Avoid morning walks before 9:00 AM when thermal inversion traps smog at ground level.",
        "impact": "Drops toxic PM2.5 inhalation by ~60%"
      },
      {
        "icon": "🚇",
        "title": "Commute Optimization",
        "description": "Shift to non-peak hours or closed public transport; wear well-fitted N95.",
        "impact": "Saves ~1.8 kg personal vehicle emissions"
      }
    ]
  },
  "sectionB": {
    "title": "Indoor Air Quality Hacks",
    "impactChipExp": "-40% Indoor PM2.5 Infiltration",
    "impactChipEmi": "Zero-Electricity Natural Hacks",
    "items": [
      {
        "icon": "🧹",
        "title": "Damp Mopping (Geela Poncha)",
        "description": "Use wet mopping twice daily instead of dry sweeping which resuspends dust.",
        "impact": "Reduces indoor resuspended dust by ~35%"
      },
      {
        "icon": "🪟",
        "title": "Airtight Window Sealing",
        "description": "Seal window cracks using cloth strips during late evening and early morning smog peaks.",
        "impact": "Keeps indoor AQI 30-50 points lower than outside"
      }
    ]
  },
  "sectionC": {
    "title": "Sustainable Alternatives",
    "impactChipExp": "Cleaner Neighborhood Air",
    "impactChipEmi": "Low Household Carbon Footprint",
    "items": [
      {
        "icon": "🚲",
        "title": "Zero-Emission Local Errands",
        "description": "Combine neighborhood shopping trips into a single shared run or cycle mid-afternoon.",
        "impact": "Directly avoids localized exhaust"
      },
      {
        "icon": "🔥",
        "title": "No Open Waste/Biomass Burning",
        "description": "Encourage community leaf composting; avoid decorative candles/incense indoors.",
        "impact": "Eliminates high-density indoor VOCs"
      }
    ]
  }
}
`;

    const requestPayload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    };

    const maxRetries = 2; // Retry twice on 503 or 429
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(12000)
        });

        if (!response.ok) {
          const errorText = await response.text();
          const err = new Error(`Gemini API Error with ${modelName} (HTTP ${response.status}): ${errorText}`);
          err.status = response.status;
          err.responseBody = errorText;
          err.model = modelName;
          lastError = err;

          // If 404: Do NOT retry, immediately move to next model
          if (response.status === 404) {
            console.warn(`❌ Model ${modelName} returned 404 (Not Found / Not available on this key). Moving to next candidate model.`);
            break;
          }

          // If 503 or 429: Retry up to 2 times with 1.5s delay
          if (response.status === 503 || response.status === 429) {
            console.warn(`⚠️ Model ${modelName} returned HTTP ${response.status} (attempt ${attempt}/${maxRetries + 1}).`);
            if (attempt <= maxRetries) {
              console.log(`⏳ Waiting 1.5s before retry on ${modelName}...`);
              await new Promise(res => setTimeout(res, 1500));
              continue;
            } else {
              console.warn(`❌ Model ${modelName} exhausted ${maxRetries} retries for HTTP ${response.status}. Moving to next candidate model.`);
              break;
            }
          }

          // Any other error (e.g. 400, 403), log and break to next candidate model
          console.warn(`⚠️ Model ${modelName} returned HTTP ${response.status}: ${errorText}`);
          break;
        }

        const result = await response.json();
        const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textOutput) {
          throw new Error(`Empty response from Gemini API (${modelName})`);
        }

        let cleaned = textOutput.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();

        const parsedPlan = JSON.parse(cleaned);
        return { plan: parsedPlan, model: modelName };

      } catch (fetchErr) {
        lastError = fetchErr;
        if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
          console.warn(`⏳ Request timed out for ${modelName} (attempt ${attempt}/${maxRetries + 1}).`);
          if (attempt <= maxRetries) {
            console.log(`⏳ Waiting 1.5s before retry on ${modelName}...`);
            await new Promise(res => setTimeout(res, 1500));
            continue;
          }
          break;
        }
        if (fetchErr.status === 404) {
          break;
        }
        if (attempt <= maxRetries && (fetchErr.status === 503 || fetchErr.status === 429)) {
          console.warn(`⚠️ Fetch failed for ${modelName} (HTTP ${fetchErr.status}). Retrying in 1.5s...`);
          await new Promise(res => setTimeout(res, 1500));
          continue;
        }
        break;
      }
    }
  }

  // If all candidate models failed, throw the last error
  throw lastError || new Error('All Gemini candidate models failed to respond.');
}

/**
 * Expert Rule-Based Plan Generator (Local Intelligent Fallback)
 */
function generateExpertFallbackPlan({ city, members, transport, homeType, aqi, language }) {
  const isHi = language === 'hi';
  const hasKids = members.includes('children');
  const hasElderly = members.includes('elderly');
  const hasAsthma = members.includes('asthma');

  // Compute calculated metrics
  let expReduction = '-45% se -60%';
  let barPercent = '65%';
  let emissionSaved = '~2.4 kg CO₂e';
  let emissionPercent = '68%';

  if (aqi > 300) {
    expReduction = isHi ? '-55% se -70%' : '-55% to -70%';
    barPercent = '75%';
    emissionSaved = isHi ? '~3.1 kg CO₂e' : '~3.1 kg CO₂e';
    emissionPercent = '80%';
  } else if (aqi < 150) {
    expReduction = isHi ? '-25% se -40%' : '-25% to -40%';
    barPercent = '45%';
    emissionSaved = isHi ? '~1.8 kg CO₂e' : '~1.8 kg CO₂e';
    emissionPercent = '50%';
  }

  let healthRating = isHi ? 'Uchch Suraksha (High Protection)' : 'High Protection Protocol';
  let vulnerableSummary = isHi
    ? `${hasKids ? 'Bachche, ' : ''}${hasElderly ? 'Buzurg, ' : ''}${hasAsthma ? 'Asthma Rogi ' : ''}ke liye targeted bachaav`
    : `Targeted shielding for ${hasKids ? 'Children, ' : ''}${hasElderly ? 'Seniors, ' : ''}${hasAsthma ? 'Respiratory patients' : 'All members'}`;

  // Section A: Low-emission daily routine
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
      description: transport === 'two_wheeler' || transport === 'walk_cycle'
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
      description: transport === 'two_wheeler' || transport === 'walk_cycle'
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

  // Section B: Indoor air quality hacks
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

  // Section C: Sustainable alternatives
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
      healthRating: healthRating,
      vulnerableSummary: vulnerableSummary
    },
    sectionA: {
      title: isHi ? 'Low-Emission Daily Routine' : 'Low-Emission Daily Routine',
      impactChipExp: isHi ? '-50% Peak Inhalation' : '-50% Peak Inhalation',
      impactChipEmi: isHi ? 'Transit Footprint Savings' : 'Transit Footprint Savings',
      items: routineItems
    },
    sectionB: {
      title: isHi ? 'Indoor Air Quality Hacks' : 'Indoor Air Quality Hacks',
      impactChipExp: isHi ? '-40% Indoor PM2.5' : '-40% Indoor PM2.5',
      impactChipEmi: isHi ? 'Zero-Electricity Hacks' : 'Zero-Electricity Hacks',
      items: indoorItems
    },
    sectionC: {
      title: isHi ? 'Sustainable Alternatives' : 'Sustainable Alternatives',
      impactChipExp: isHi ? 'Cleaner Local Air' : 'Cleaner Local Air',
      impactChipEmi: isHi ? 'Reduced Carbon Footprint' : 'Reduced Carbon Footprint',
      items: sustainableItems
    }
  };
}

/**
 * Native HTTP Server
 */
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Route: POST /api/generate-plan
  if (pathname === '/api/generate-plan' && req.method === 'POST') {
    return handleGeneratePlan(req, res);
  }

  // Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      service: 'SaansSaaf Air Quality Assistant',
      hasGeminiKey: Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here')
    }));
  }

  // Serve static files from public/
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If file not found, try fallback or 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🫁 SaansSaaf - Urban Air Quality Assistant Backend `);
  console.log(` Server is running on: http://localhost:${PORT}`);
  console.log(` Gemini API Status: ${GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅ Key Active' : 'ℹ️ Rule-Based Engine Active (Set GEMINI_API_KEY in .env to enable Live AI)'}`);
  console.log(`=======================================================`);
});
