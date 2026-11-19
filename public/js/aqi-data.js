/**
 * aqi-data.js
 * AQI Thresholds, Category Definitions, Color Coding, and Bilingual Explanations
 */

const AQI_LEVELS = [
  {
    min: 0,
    max: 50,
    category: 'good',
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    title: {
      hi: 'Achhi Hawa (Good)',
      en: 'Good Air (Safe)'
    },
    desc: {
      hi: 'Hawa saaf aur taaza hai. Pradushan ka koi swasthya jokhim nahi hai. Sabhi log khulkar bahar ghoom sakte hain.',
      en: 'Air quality is satisfactory, and air pollution poses little or no risk. Safe for all outdoor activities.'
    },
    healthTag: {
      hi: '✅ Sabhi ke liye surakshit (Safe for Everyone)',
      en: '✅ Clean & Ideal Air'
    },
    estimatedImpact: {
      expReduction: '-0%',
      emissionsBaseline: 'Minimal footprint',
      vulnerableProtection: 'Full Freedom'
    }
  },
  {
    min: 51,
    max: 100,
    category: 'moderate',
    color: '#eab308',
    bgColor: '#fefce8',
    borderColor: '#fef08a',
    title: {
      hi: 'Madhyam (Moderate)',
      en: 'Moderate'
    },
    desc: {
      hi: 'Hawa theek hai par asthma ya saans ke mareezon ko halki pareshani ho sakti hai. Aam logon ke liye surakshit.',
      en: 'Air quality is acceptable. However, highly sensitive people may experience minor breathing discomfort.'
    },
    healthTag: {
      hi: '⚠️ Sensitive logon ke liye thodi savdhani zaroori',
      en: '⚠️ Moderate concern for respiratory patients'
    },
    estimatedImpact: {
      expReduction: '-15% se -25%',
      emissionsBaseline: '~1.0 kg CO₂e saved',
      vulnerableProtection: 'Moderate Caution'
    }
  },
  {
    min: 101,
    max: 200,
    category: 'poor',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    title: {
      hi: 'Kharab (Poor / Unhealthy)',
      en: 'Poor / Unhealthy'
    },
    desc: {
      hi: 'Bachchon, buzurgon aur asthma ke mareezon ko saans lene mein takleef ho sakti hai. Lambi outdoor exercise se bachein.',
      en: 'Breathing discomfort to people with lung/heart disease, children and older adults. Limit prolonged outdoor exertion.'
    },
    healthTag: {
      hi: '🚨 Bachche aur Buzurg outdoor activities kam karein',
      en: '🚨 Sensitive groups should avoid strenuous outdoor activity'
    },
    estimatedImpact: {
      expReduction: '-30% se -45%',
      emissionsBaseline: '~1.8 kg CO₂e saved',
      vulnerableProtection: 'High Caution Required'
    }
  },
  {
    min: 201,
    max: 300,
    category: 'verypoor',
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    title: {
      hi: 'Bahut Kharab (Very Poor)',
      en: 'Very Poor / Health Warning'
    },
    desc: {
      hi: 'Lambi avadhi tak bahar rehne se swasth logon ko bhi saans ki takleef ho sakti hai. Mask ka upyog karein, khidkiyan band rakhein.',
      en: 'Triggers respiratory illness on prolonged exposure. Significantly affects vulnerable groups. Wear N95 masks.'
    },
    healthTag: {
      hi: '🔴 High Risk: Bahar nikalte waqt Mask zaroori',
      en: '🔴 Health Alert: Wear N95 outdoors'
    },
    estimatedImpact: {
      expReduction: '-45% se -60%',
      emissionsBaseline: '~2.5 kg CO₂e saved',
      vulnerableProtection: 'Strict Indoor Protocol'
    }
  },
  {
    min: 301,
    max: 9999,
    category: 'severe',
    color: '#881337',
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
    title: {
      hi: 'Gambhir / Aapatkalin (Severe)',
      en: 'Severe / Hazardous (Emergency)'
    },
    desc: {
      hi: 'Emergency jaise halaat! Swasth logon ke fefadon par bhi bura asar padta hai. Bachchon aur buzurgon ko poori tarah ghar ke andar rakhein.',
      en: 'Emergency conditions! Seriously impacts healthy people and causes severe respiratory distress to vulnerable groups. Stay indoors.'
    },
    healthTag: {
      hi: '⛔ Severe Alert: Bahar bilkul na niklein, Purifier/Wet-mop upyog karein',
      en: '⛔ Severe Emergency: Remain indoors, zero outdoor activity'
    },
    estimatedImpact: {
      expReduction: '-55% se -75%',
      emissionsBaseline: '~3.2 kg CO₂e saved',
      vulnerableProtection: 'Maximum Isolation & Protection'
    }
  }
];

/**
 * Get AQI Level object by numeric score
 * @param {number} aqi 
 * @returns {object} AQI level metadata
 */
function getAqiDetails(aqi) {
  const score = Number(aqi) || 0;
  for (const level of AQI_LEVELS) {
    if (score >= level.min && score <= level.max) {
      return level;
    }
  }
  return AQI_LEVELS[AQI_LEVELS.length - 1]; // Fallback to Severe
}

// Export for browser or node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AQI_LEVELS, getAqiDetails };
}
