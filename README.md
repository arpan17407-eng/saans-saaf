# 🫁 SaansSaaf - Urban Air Quality & Smog Assistant
> **PromptWars Challenge 6: Urban Air Quality Assistant**
> *Helping families and communities navigate severe winter smog and urban air pollution with GenAI-powered routines, indoor hacks, and sustainable choices.*
**🔗 Live demo:** https://saans-saaf.onrender.com
*(Free hosting par pehli load mein ~1 minute lag sakta hai.)*
---

## 🌟 Overview & Concept

Winter air pollution in Indian urban hubs (such as Delhi NCR, Kanpur, Patna, Lucknow, Mumbai) frequently crosses hazardous AQI levels (300 to 500+). Vulnerable family members—especially children under 12, elderly seniors, and asthma patients—suffer the most. 

**SaansSaaf** is a mobile-first, bilingual (Hindi + English) web application that generates personalized, low-emission daily routines, zero-to-low cost indoor air quality hacks, and sustainable community alternatives, complete with a visual **Impact Meter** that quantifies exposure drop and emissions saved.

---

## ✨ Core Features

1. **Family & Lifestyle Profile Form:**
   - **City selection:** Quick chips for popular smog-hit cities (Delhi NCR, Kanpur, Patna, Lucknow, Mumbai) or custom input.
   - **Vulnerable members checkboxes:** 👶 Children, 👵 Senior Citizens, 🫁 Asthma/Respiratory patients, 🐾 Pets.
   - **Commute selection:** Metro/Bus, Two-wheeler, Car, Walk/Cycle, Work from Home.
   - **Housing type:** High-rise Apartment, Low-rise Apartment, Independent House, Congested Colony.

2. **Dual AQI Input & Health Color-Coded Explainer:**
   - Synchronized numeric input (0–999) and smooth range slider (0–500+).
   - Real-time color coding adhering to CPCB & WHO standards:
     - 🟢 **0–50 (Good):** Green - Safe for outdoor activity.
     - 🟡 **51–100 (Moderate):** Yellow - Sensitive individuals exercise caution.
     - 🟠 **101–200 (Poor):** Orange - Children and seniors reduce exertion.
     - 🔴 **201–300 (Very Poor):** Red - Unhealthy, N95 masks strongly recommended.
     - 🟣 **301+ (Severe / Hazardous):** Maroon - Emergency protocol, strictly stay indoors.
   - Instant quick-preset buttons (Good, Moderate, Poor, Very Poor, Severe).

3. **GenAI Daily Plan (Powered by Google Gemini API):**
   - **Section (a): Low-Emission Daily Routine:** Safe outdoor hours (12 PM - 4 PM), peak thermal inversion avoidance, tailored commute adjustments.
   - **Section (b): Indoor Air Quality Hacks:** Wet/damp mopping (geela poncha) to avoid particle resuspension, external window sealing during inversion peaks, kitchen ventilation and zero-incense guidance.
   - **Section (c): Sustainable Alternatives:** Batch neighborhood errands, micro-mobility, eliminating open biomass/waste fires, natural air-purifying plants (Snake Plant, Areca Palm).

4. **Impact Meter & Badges:**
   - Visual percentage bar for **Smog Exposure Reduction** (e.g., `-45% to -65%`).
   - Estimated **Daily Emissions Avoided** (e.g., `~2.8 kg CO₂e saved`).
   - **Family Safety Index** badge for vulnerable members.
   - Clear disclosure badge: *"Numbers rough estimate hain (based on standard public health research models)"*.

5. **Safety & Disclaimers:**
   - Prominent sticky top bar and bottom medical advisory: *"Medical Disclaimer: Ye general jaankari hai, kisi doctor ya medical professional ki salah nahi hai."*

6. **Bilingual UI & Plan Output:**
   - Instant 1-click toggle between 🇮🇳 **हिंदी (Hindi)** and 🇬🇧 **English**.

7. **Utility Actions:**
   - 📋 One-click copy formatted plan to clipboard.
   - 🖨️ Clean print / Save-as-PDF stylesheet.

---

## 🛠️ Tech Stack & Security

- **Frontend:** Vanilla HTML5, Modern Responsive CSS3 (CSS Variables, Flexbox/Grid, Mobile-first), Vanilla JavaScript (ES6+).
- **Backend:** Node.js (with built-in HTTP server and Express support).
- **AI Integration:** Google Gemini API (`gemini-2.5-flash`).
- **Security:**
  - `GEMINI_API_KEY` is loaded securely via server-side `.env`.
  - The API key is **never exposed** to the client-side browser or git repository.
  - Full input validation & sanitization on both frontend and backend.
  - Zero-downtime fallback rule engine: if no API key is provided, the application continues to run seamlessly using intelligent localized guidelines.

---

## 🚀 How to Run

### 1. Configure Gemini API Key
In the root directory, create or edit `.env`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

### 2. Start the Application
Run using Node.js:
```bash
node server.js
```
*(Or if you use npm: `npm start`)*

### 3. Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📁 File Structure

```
challenge 6/
├── .env                  # API Key configuration (hidden from frontend)
├── .env.example          # Sample environment template
├── .gitignore            # Ignores node_modules and .env
├── package.json          # Node project config and scripts
├── server.js             # Secure backend server & Gemini API proxy
├── README.md             # Documentation & Setup guide
└── public/               # Frontend Client
    ├── index.html        # Semantic mobile-first layout
    ├── css/
    │   └── style.css     # Responsive styles, health colors, animations
    └── js/
        ├── aqi-data.js   # AQI categories, color scales, thresholds
        └── app.js        # Form validation, slider sync, API fetch, UI rendering
```

---

## ⚕️ Medical Disclaimer
*SaansSaaf is designed exclusively for educational, informational, and community smog mitigation purposes. It does not provide medical diagnoses, treatment plans, or clinical advice. In case of respiratory distress, acute wheezing, or asthma emergencies, please consult a certified physician immediately.*
