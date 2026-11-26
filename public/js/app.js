'use strict';

/**
 * app.js
 * Main Client-side Controller for SaansSaaf
 */

// UI Localization Dictionary
const I18N = {
  hi: {
    medicalDisclaimerTop: '<strong>Medical Disclaimer:</strong> Ye general jaankari hai, kisi doctor ya medical professional ki salah nahi hai.',
    headerSubtitle: 'Winter Smog & Urban Air Quality Assistant',
    langLabel: 'Bhasha:',
    introHeading: 'Ghar aur Parivar ko Smog se Bachayein',
    introDesc: 'Apne shehar ki AQI aur parivar ki zaroorato ke hisaab se payein personalized low-emission routine, indoor air hacks aur sustainable options.',
    profileHeading: 'Aapka Parivar & Lifestyle Profile',
    profileSub: 'Personalized AI recommendations ke liye zaroori details',
    lblCity: 'Shehar (City) <span class="required">*</span>',
    cityPlaceholder: 'Jaise: Delhi NCR, Kanpur, Patna, Mumbai...',
    lblQuickCities: 'Lokpriya:',
    lblMembers: 'Ghar mein kaun-kaun hain? (Select karein)',
    lblKids: 'Chhote Bachche',
    subKids: '< 12 varsh ke',
    lblElderly: 'Buzurg Sadasya',
    subElderly: 'Senior Citizens (60+)',
    lblAsthma: 'Asthma / Saans Rogi',
    subAsthma: 'Respiratory Sensitivity',
    lblPets: 'Paltu Janwar (Pets)',
    subPets: 'Dogs/Cats etc.',
    lblTransport: 'Daily Transport ka Mukhy Tareeka <span class="required">*</span>',
    optSelectTransport: 'Chuniye...',
    optMetro: '🚇 Metro / Public Bus (Sarkari Transport)',
    optTwoWheeler: '🛵 Scooter / Motorcycle (Open air)',
    optCar: '🚗 Personal Car / Taxi (AC/Closed)',
    optWalk: '🚶 Walk / Cycle (Exposed)',
    optWfh: '💻 Work from Home (Kam travel)',
    lblHomeType: 'Ghar ka Type <span class="required">*</span>',
    optSelectHome: 'Chuniye...',
    optHighrise: '🏢 High-rise Apartment (Floor 5+)',
    optLowrise: '🏬 Low-rise Apartment (Floor 1-4)',
    optIndependent: '🏡 Independent House / Ground Floor',
    optCongested: '🏘️ Dense / Busy Road Colony',
    aqiHeading: 'Air Quality Index (AQI) Input',
    aqiSub: 'Number likhein ya slider se chunein',
    lblCurrentAqi: 'Current AQI',
    lblAqiNumber: 'AQI Number Darj Karein:',
    lblPresetAqi: 'Quick Select Presets:',
    btnSubmitText: 'AI Daily Plan & Impact Dekhein',
    loadingTitle: 'Gemini AI Plan Taiyar Kar Raha Hai...',
    loadingMsg: 'Aapke shehar ki hawa aur parivar ke sadasyo ke hisaab se sabse safe routine banayi ja rahi hai.',
    errorTitle: 'Kuch Gadbad Huyi!',
    btnRetryText: 'Dobara Koshish Karein',
    impactHeaderTitle: 'Aapke Daily Plan Ka Projected Asar',
    impactHeaderSub: 'SaansSaaf recommendations apnane se aapka aur paryavaran ka fayda',
    btnNewPlanText: 'Profile Badlein',
    lblExpReduction: 'Smog Exposure Kam',
    subExposure: 'Ghar ke andar aur transit mein PM2.5 se bachaav',
    lblEmissionSaved: 'Daily Emissions Bachengi',
    subEmissions: 'Eco-friendly transit aur energy choices se',
    lblHealthSafety: 'Family Safety Index',
    subHealthSafety: 'Peak smog timing mein bahar nikalna zero',
    lblRoughEstimate: '<strong>Dhyan dein:</strong> Yeh numbers standard environmental health research ke aadharit <em>rough estimates (anumaanit aakde)</em> hain, exact lab readings nahi.',
    badgeSecA: 'Section A',
    titleSecA: 'Low-Emission Daily Routine (Surakshit Dainik Schedule)',
    descSecA: 'Bahar nikalne ke safe ghante aur commute ko optimize karne ke tareeke',
    badgeSecB: 'Section B',
    titleSecB: 'Indoor Air Quality Hacks (Ghar Ki Hawa Saaf Rakhne Ke Upay)',
    descSecB: 'Bina mehenge purifier ke ghar ke andar particulate pollution kam karein',
    badgeSecC: 'Section C',
    titleSecC: 'Sustainable Alternatives (Paryavaran-Anukool Vikalp)',
    descSecC: 'Aisi aadat jo aapko bhi bachaye aur shehar ki hawa ko aur kharab hone se roke',
    btnCopyText: 'Plan Copy Karein',
    btnPrintText: 'Save / Print Plan',
    medAlertTitle: 'Swasthya Salah (Medical Notice)',
    medAlertBody: 'Yeh sujhaav samanya saavdhani aur awareness ke liye hain, kisi certified medical doctor ki prescription ya salah ka vikalp nahi hain. Yadi parivar mein kisi ko saans lene mein kathinai, seene mein jakdan ya khansi ho, toh kripya turant nazdeeki doctor ya hospital se sampark karein.',
    footerNote: '"Saaf Hawa, Surakshit Parivar" • Powered by Google Gemini API • Har kadam saaf kal ke liye.'
  },
  en: {
    medicalDisclaimerTop: '<strong>Medical Disclaimer:</strong> This provides general informational guidance, not professional medical advice.',
    headerSubtitle: 'Winter Smog & Urban Air Quality Assistant',
    langLabel: 'Language:',
    introHeading: 'Protect Your Family & Home from Severe Smog',
    introDesc: 'Get a personalized low-emission daily routine, indoor air hacks, and sustainable options tailored to your local AQI and household vulnerabilities.',
    profileHeading: 'Family & Lifestyle Profile',
    profileSub: 'Essential details for personalized AI recommendations',
    lblCity: 'City <span class="required">*</span>',
    cityPlaceholder: 'e.g., Delhi NCR, Kanpur, Patna, Mumbai...',
    lblQuickCities: 'Popular:',
    lblMembers: 'Who lives in your home? (Select all that apply)',
    lblKids: 'Young Children',
    subKids: 'Under 12 years',
    lblElderly: 'Elderly Members',
    subElderly: 'Senior Citizens (60+)',
    lblAsthma: 'Asthma / Respiratory Issues',
    subAsthma: 'Breathing Sensitivity',
    lblPets: 'Household Pets',
    subPets: 'Dogs/Cats etc.',
    lblTransport: 'Primary Daily Commute Mode <span class="required">*</span>',
    optSelectTransport: 'Select mode...',
    optMetro: '🚇 Metro / Public Bus (Mass Transit)',
    optTwoWheeler: '🛵 Scooter / Motorcycle (Open Air)',
    optCar: '🚗 Personal Car / Cab (Enclosed/AC)',
    optWalk: '🚶 Walking / Cycling (Exposed)',
    optWfh: '💻 Work from Home (Minimal Travel)',
    lblHomeType: 'Home Architecture Type <span class="required">*</span>',
    optSelectHome: 'Select type...',
    optHighrise: '🏢 High-rise Apartment (Floor 5+)',
    optLowrise: '🏬 Low-rise Apartment (Floor 1-4)',
    optIndependent: '🏡 Independent House / Ground Floor',
    optCongested: '🏘️ Dense / Main Road Colony',
    aqiHeading: 'Air Quality Index (AQI) Input',
    aqiSub: 'Type a number or slide to select',
    lblCurrentAqi: 'Current AQI',
    lblAqiNumber: 'Enter AQI Value:',
    lblPresetAqi: 'Quick Select Presets:',
    btnSubmitText: 'Generate AI Daily Plan & Impact',
    loadingTitle: 'Gemini AI is Generating Your Plan...',
    loadingMsg: 'Analyzing local smog intensity and vulnerable family profiles to craft safe routines and hacks.',
    errorTitle: 'Something Went Wrong!',
    btnRetryText: 'Try Again',
    impactHeaderTitle: 'Projected Impact of Your Daily Plan',
    impactHeaderSub: 'Tangible benefits for your family’s lungs and city emissions',
    btnNewPlanText: 'Edit Profile',
    lblExpReduction: 'Reduced Smog Exposure',
    subExposure: 'PM2.5 protection during commutes & indoor stay',
    lblEmissionSaved: 'Estimated Daily Emissions Avoided',
    subEmissions: 'From optimized transit & energy conservation',
    lblHealthSafety: 'Family Safety Index',
    subHealthSafety: 'Eliminates peak outdoor inversion exposure',
    lblRoughEstimate: '<strong>Note:</strong> These metrics are <em>approximate rough estimates</em> modeled on standard public health research, not exact laboratory readings.',
    badgeSecA: 'Section A',
    titleSecA: 'Low-Emission Daily Routine (Safe Daily Schedule)',
    descSecA: 'Safe outdoor windows and optimal commute scheduling',
    badgeSecB: 'Section B',
    titleSecB: 'Indoor Air Quality Hacks (Zero-to-Low Cost)',
    descSecB: 'Reduce indoor particulate infiltration without expensive purifiers',
    badgeSecC: 'Section C',
    titleSecC: 'Sustainable Alternatives (Eco-Friendly Lifestyle)',
    descSecC: 'Habits that protect your family and curb neighborhood emissions',
    btnCopyText: 'Copy Plan',
    btnPrintText: 'Save / Print Plan',
    medAlertTitle: 'Health & Medical Advisory',
    medAlertBody: 'These recommendations are for general protective awareness and do not replace personalized physician care or prescriptions. If anyone in your household experiences wheezing, chest tightness, or respiratory distress, contact a healthcare professional or emergency care immediately.',
    footerNote: '"Breathe Safe, Live Clean" • Powered by Google Gemini API • Every step towards cleaner air.'
  }
};

// Application State
const state = {
  language: 'hi', // default Hindi
  aqi: 340,
  city: '',
  members: [],
  transport: '',
  homeType: '',
  currentPlanData: null
};

// DOM Elements
const elements = {
  form: document.getElementById('assistantForm'),
  cityInput: document.getElementById('cityInput'),
  cityError: document.getElementById('cityError'),
  transportSelect: document.getElementById('transportSelect'),
  homeTypeSelect: document.getElementById('homeTypeSelect'),
  aqiSlider: document.getElementById('aqiSlider'),
  aqiNumberInput: document.getElementById('aqiNumberInput'),
  aqiError: document.getElementById('aqiError'),
  aqiBigValue: document.getElementById('aqiBigValue'),
  aqiCategoryBadge: document.getElementById('aqiCategoryBadge'),
  aqiDescText: document.getElementById('aqiDescText'),
  aqiHealthTag: document.getElementById('aqiHealthTag'),
  aqiDisplayBox: document.getElementById('aqiDisplayBox'),
  btnSubmitText: document.getElementById('btnSubmitText'),
  loadingState: document.getElementById('loadingState'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  btnRetry: document.getElementById('btnRetry'),
  resultsSection: document.getElementById('resultsSection'),
  btnNewPlan: document.getElementById('btnNewPlan'),
  btnCopyPlan: document.getElementById('btnCopyPlan'),
  btnPrintPlan: document.getElementById('btnPrintPlan'),
  toast: document.getElementById('toastNotification'),

  // Impact metrics
  valExposure: document.getElementById('valExposure'),
  barExposure: document.getElementById('barExposure'),
  valEmissions: document.getElementById('valEmissions'),
  barEmissions: document.getElementById('barEmissions'),
  valHealthSafety: document.getElementById('valHealthSafety'),
  badgeVulnerableGroup: document.getElementById('badgeVulnerableGroup'),

  // Section bodies
  contentSecA: document.getElementById('contentSecA'),
  contentSecB: document.getElementById('contentSecB'),
  contentSecC: document.getElementById('contentSecC'),

  // Section footers
  chipExpA: document.getElementById('chipExpA'),
  chipEmiA: document.getElementById('chipEmiA'),
  chipExpB: document.getElementById('chipExpB'),
  chipEmiB: document.getElementById('chipEmiB'),
  chipExpC: document.getElementById('chipExpC'),
  chipEmiC: document.getElementById('chipEmiC')
};

// Cached DOM references for i18n keys (populated once on DOMContentLoaded)
const i18nElements = new Map();
let aqiRafId = null;

/**
 * Initialize application listeners and defaults
 */
document.addEventListener('DOMContentLoaded', () => {
  for (const key of Object.keys(I18N.hi)) {
    const el = document.getElementById(key);
    if (el) i18nElements.set(key, el);
  }

  setupLanguageSwitching();
  setupAqiSync();
  setupQuickChips();
  setupPresetButtons();
  setupFormSubmission();
  setupActionButtons();

  // Initial AQI UI render
  updateAqiUI(state.aqi);
});

/**
 * Switch UI Language
 */
function setLanguage(lang) {
  state.language = lang;
  document.documentElement.lang = lang;
  document.body.className = `lang-${lang}`;

  // Update button active states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // Apply translations using cached DOM references
  const dict = I18N[lang];
  for (const [key, el] of i18nElements.entries()) {
    const text = dict[key];
    if (text !== undefined) {
      if (text.includes('<') && text.includes('>')) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    }
  }

  // City placeholder
  if (elements.cityInput) {
    elements.cityInput.placeholder = dict.cityPlaceholder;
  }

  // Refresh current AQI explanation card in selected language
  updateAqiUI(state.aqi);

  // If a plan is already rendered, re-render it if cached
  if (state.currentPlanData) {
    renderPlan(state.currentPlanData);
  }
}

function setupLanguageSwitching() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selected = e.currentTarget.dataset.lang;
      if (selected && selected !== state.language) {
        setLanguage(selected);
      }
    });
  });
}

/**
 * Schedule AQI UI update on the next animation frame to avoid layout thrashing during slider drag.
 */
function scheduleAqiUIUpdate(aqi) {
  if (aqiRafId !== null) cancelAnimationFrame(aqiRafId);
  aqiRafId = requestAnimationFrame(() => {
    aqiRafId = null;
    updateAqiUI(aqi);
  });
}

/**
 * Sync Range Slider & Number Input with live color changes
 */
function setupAqiSync() {
  elements.aqiSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    elements.aqiNumberInput.value = val;
    state.aqi = val;
    scheduleAqiUIUpdate(val);
  });

  elements.aqiNumberInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 999) val = 999;

    elements.aqiSlider.value = Math.min(val, 500);
    state.aqi = val;
    scheduleAqiUIUpdate(val);
  });
}

/**
 * Update AQI Display box and CSS variables
 */
function updateAqiUI(aqi) {
  const details = getAqiDetails(aqi);
  const lang = state.language;

  // Update values
  elements.aqiBigValue.textContent = aqi;
  elements.aqiCategoryBadge.textContent = details.title[lang];
  elements.aqiDescText.textContent = details.desc[lang];
  elements.aqiHealthTag.textContent = details.healthTag[lang];

  // Set CSS Variables on document root for live theme switching
  document.documentElement.style.setProperty('--current-aqi-color', details.color);
  document.documentElement.style.setProperty('--current-aqi-bg', details.bgColor);
  document.documentElement.style.setProperty('--current-aqi-border', details.borderColor);
}

/**
 * City Quick-Select Chips
 */
function setupQuickChips() {
  document.querySelectorAll('.chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      const city = chip.dataset.city;
      elements.cityInput.value = city;
      clearError(elements.cityInput, elements.cityError);
      elements.cityInput.focus();
    });
  });
}

/**
 * AQI Quick Preset Buttons
 */
function setupPresetButtons() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.val, 10);
      elements.aqiNumberInput.value = val;
      elements.aqiSlider.value = Math.min(val, 500);
      state.aqi = val;
      updateAqiUI(val);
    });
  });
}

/**
 * Handle Form Submission & Validation
 */
function setupFormSubmission() {
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Collect Data
    const checkedMembers = Array.from(document.querySelectorAll('input[name="members"]:checked'))
      .map(cb => cb.value);

    state.city = elements.cityInput.value.trim();
    state.transport = elements.transportSelect.value;
    state.homeType = elements.homeTypeSelect.value;
    state.members = checkedMembers;

    const payload = {
      city: state.city,
      members: state.members,
      transport: state.transport,
      homeType: state.homeType,
      aqi: state.aqi,
      language: state.language
    };

    await fetchPlanFromAPI(payload);
  });

  elements.btnRetry.addEventListener('click', () => {
    elements.errorState.style.display = 'none';
    elements.form.dispatchEvent(new Event('submit'));
  });
}

/**
 * Form Validation
 */
function validateForm() {
  let isValid = true;

  // City validation
  const city = elements.cityInput.value.trim();
  if (!city) {
    showError(elements.cityInput, elements.cityError, 
      state.language === 'hi' ? 'Kripya apna shehar darj karein.' : 'Please enter your city.');
    isValid = false;
  } else {
    clearError(elements.cityInput, elements.cityError);
  }

  // Transport validation
  if (!elements.transportSelect.value) {
    showError(elements.transportSelect, null, '');
    if (isValid) elements.transportSelect.focus();
    isValid = false;
  } else {
    clearError(elements.transportSelect, null);
  }

  // Home Type validation
  if (!elements.homeTypeSelect.value) {
    showError(elements.homeTypeSelect, null, '');
    if (isValid) elements.homeTypeSelect.focus();
    isValid = false;
  } else {
    clearError(elements.homeTypeSelect, null);
  }

  // AQI check
  const aqiVal = parseInt(elements.aqiNumberInput.value, 10);
  if (isNaN(aqiVal) || aqiVal < 0) {
    showError(elements.aqiNumberInput, elements.aqiError,
      state.language === 'hi' ? 'Kripya sahi AQI number daalein (0 ya usse adhik).' : 'Please enter a valid AQI number.');
    isValid = false;
  } else {
    clearError(elements.aqiNumberInput, elements.aqiError);
  }

  return isValid;
}

function showError(inputEl, errorEl, msg) {
  inputEl.classList.add('is-invalid');
  inputEl.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.add('active');
  }
}

function clearError(inputEl, errorEl) {
  inputEl.classList.remove('is-invalid');
  inputEl.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('active');
  }
}

/**
 * API Call to Backend Server
 */
async function fetchPlanFromAPI(payload) {
  // Show Loading View
  elements.resultsSection.style.display = 'none';
  elements.errorState.style.display = 'none';
  elements.loadingState.style.display = 'block';

  // Smooth scroll to loading state
  elements.loadingState.scrollIntoView({ behavior: 'smooth', block: 'center' });

  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error: HTTP ${response.status}`);
    }

    const data = await response.json();
    state.currentPlanData = data;

    // Render results
    elements.loadingState.style.display = 'none';
    renderPlan(data);
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    console.error('Plan Generation Error:', error);
    elements.loadingState.style.display = 'none';
    elements.errorMessage.textContent = error.message || 
      (state.language === 'hi' 
        ? 'Plan generate karne mein takleef huyi. Kripya backend server ya API key check karein.'
        : 'Failed to generate plan. Please verify backend server and API key.');
    elements.errorState.style.display = 'block';
    elements.errorState.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Render Plan & Impact Meter into DOM
 */
function renderPlan(planData) {
  const lang = state.language;

  // 0. Source Badge (Gemini AI vs Fallback Engine)
  const sourceBadge = document.getElementById('planSourceBadge');
  if (sourceBadge) {
    const isGemini = planData.source && planData.source.startsWith('gemini');
    if (isGemini) {
      sourceBadge.className = 'source-badge source-gemini';
      const modelName = planData.model || (planData.source.includes('(') ? planData.source.split('(')[1].replace(')', '').trim() : 'AI');
      sourceBadge.innerHTML = `✨ Gemini AI <span class="model-tag">${escapeHtml(modelName)}</span>`;
      sourceBadge.title = `Response generated live via Google Gemini API: ${planData.model || planData.source}`;
    } else {
      sourceBadge.className = 'source-badge source-fallback';
      sourceBadge.innerHTML = lang === 'hi' 
        ? '🛡️ Rule-Based Engine (Fallback)' 
        : '🛡️ Rule-Based Engine (Fallback)';
      sourceBadge.title = 'Generated using built-in SaansSaaf expert rule engine';
    }
  }

  // 1. Overall Impact Metrics
  if (planData.impact) {
    elements.valExposure.textContent = planData.impact.exposureReduction || '-50% to -65%';
    elements.barExposure.style.width = planData.impact.exposureBarPercent || '65%';

    elements.valEmissions.textContent = planData.impact.emissionsSaved || '~2.8 kg CO₂e';
    elements.barEmissions.style.width = planData.impact.emissionsBarPercent || '75%';

    elements.valHealthSafety.textContent = planData.impact.healthRating || (lang === 'hi' ? 'Uchch Suraksha' : 'High Protection');
    elements.badgeVulnerableGroup.textContent = planData.impact.vulnerableSummary || 
      (lang === 'hi' ? 'Bachche aur Asthma Sadasya Surakshit' : 'Vulnerable Members Shielded');
  }

  const sections = [
    { data: planData.sectionA, content: elements.contentSecA, chipExp: elements.chipExpA, chipEmi: elements.chipEmiA },
    { data: planData.sectionB, content: elements.contentSecB, chipExp: elements.chipExpB, chipEmi: elements.chipEmiB },
    { data: planData.sectionC, content: elements.contentSecC, chipExp: elements.chipExpC, chipEmi: elements.chipEmiC }
  ];

  for (const sec of sections) {
    if (!sec.data) continue;
    renderSectionItems(sec.content, sec.data.items || []);
    if (sec.data.impactChipExp) sec.chipExp.textContent = sec.data.impactChipExp;
    if (sec.data.impactChipEmi) sec.chipEmi.textContent = sec.data.impactChipEmi;
  }
}

/**
 * Helper to render list items inside section cards
 */
function renderSectionItems(containerEl, items) {
  if (!items || items.length === 0) {
    containerEl.innerHTML = '<p class="text-muted">Koi specific recommendation uplabdh nahi hai.</p>';
    return;
  }

  const html = items.map(item => `
    <div class="plan-item">
      <span class="item-bullet">${item.icon || '🔹'}</span>
      <div class="item-content">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.description)}</p>
        ${item.impact ? `<span class="item-impact-badge">📊 Asar: ${escapeHtml(item.impact)}</span>` : ''}
      </div>
    </div>
  `).join('');

  containerEl.innerHTML = `<div class="plan-items-list">${html}</div>`;
}

/**
 * Action Buttons (Reset, Copy, Print)
 */
function setupActionButtons() {
  // New Plan / Edit Profile
  elements.btnNewPlan.addEventListener('click', () => {
    elements.resultsSection.style.display = 'none';
    elements.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Copy Plan to Clipboard
  elements.btnCopyPlan.addEventListener('click', () => {
    if (!state.currentPlanData) return;
    
    let textToCopy = `*SaansSaaf Daily Plan - ${state.city} (AQI: ${state.aqi})*\n\n`;
    textToCopy += `📊 *Estimated Impact:* Exposure Reduction: ${elements.valExposure.textContent} | Emissions Saved: ${elements.valEmissions.textContent}\n\n`;
    
    const sectionsToCopy = [
      { label: '🏃 *Section A: Low-Emission Daily Routine*', items: state.currentPlanData.sectionA?.items },
      { label: '\n🏠 *Section B: Indoor Air Quality Hacks*', items: state.currentPlanData.sectionB?.items },
      { label: '\n🌱 *Section C: Sustainable Alternatives*', items: state.currentPlanData.sectionC?.items }
    ];

    for (const sec of sectionsToCopy) {
      textToCopy += `${sec.label}\n`;
      for (const it of (sec.items || [])) {
        textToCopy += `• ${it.title}: ${it.description} (Impact: ${it.impact || 'N/A'})\n`;
      }
    }

    textToCopy += `\n⚠️ Medical Disclaimer: General jaankari hai, doctor ki salah nahi hai.\n(Generated via SaansSaaf Assistant)`;

    navigator.clipboard.writeText(textToCopy)
      .then(() => showToast(state.language === 'hi' ? '✅ Plan clipboard par copy ho gaya!' : '✅ Plan copied to clipboard!'))
      .catch(() => showToast('Failed to copy.'));
  });

  // Print Plan
  elements.btnPrintPlan.addEventListener('click', () => {
    window.print();
  });
}

/**
 * Toast Notification
 */
function showToast(msg) {
  elements.toast.textContent = msg;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

/**
 * Basic HTML escaping for XSS prevention
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
