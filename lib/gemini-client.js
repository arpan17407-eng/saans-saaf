'use strict';

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash'
];

const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 1500;
const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build the structured Gemini prompt for a family's AQI profile.
 * @param {object} params
 * @returns {string}
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
 * @param {object} params
 * @param {string} apiKey
 * @returns {Promise<{plan: object, model: string}>}
 */
async function callGeminiAPI(params, apiKey) {
  const requestPayload = {
    contents: [{ parts: [{ text: buildGeminiPrompt(params) }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  };

  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    console.log(`\n🔄 Attempting Gemini API with model: ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
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
            console.warn(`⚠️ Model ${modelName} returned HTTP ${response.status} (attempt ${attempt}/${MAX_RETRIES + 1}).`);
            if (attempt <= MAX_RETRIES) {
              await sleep(RETRY_DELAY_MS);
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

        if ((isTimeout || isRetryableStatus) && attempt <= MAX_RETRIES) {
          console.warn(`⏳ Retryable error for ${modelName} (attempt ${attempt}/${MAX_RETRIES + 1}): ${fetchErr.message}`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
}

module.exports = {
  CANDIDATE_MODELS,
  buildGeminiPrompt,
  callGeminiAPI
};
