# 🫁 SaansSaaf - Urban Air Quality & Smog Assistant

> **PromptWars Challenge 6: Urban Air Quality Assistant**
> *Helping families and communities navigate severe winter smog with GenAI-powered routines, indoor hacks and sustainable choices.*

**🔗 Live demo:** https://saans-saaf.onrender.com
*(Free hosting: the first load can take about a minute.)*

Built with **Google Antigravity** and the **Gemini API**.

---

## 🎯 Chosen Vertical

**Urban Air Quality Assistant** (PromptWars Challenge 6).

**Persona:** urban families in smog-hit Indian cities (Delhi NCR, Kanpur, Patna, Lucknow, Mumbai), especially homes with young children, elderly members or people with asthma and other respiratory issues.

## 🌟 Overview

Winter air pollution in Indian cities often crosses hazardous AQI levels (300 to 500+). Vulnerable family members suffer the most, yet most families do not know what to change in their day.

SaansSaaf is a mobile-first, bilingual (Hindi and English) web app. It turns a family profile and the day's AQI into a personalised plan with a low-emission routine, indoor air quality hacks and sustainable alternatives, and shows the direct impact of each suggestion.

## 🧠 Approach and Logic

1. **Context collection:** city, household members (children, seniors, asthma, pets), commute mode, home type and the AQI value.
2. **AQI classification:** the AQI is mapped to Good / Moderate / Poor / Very Poor / Severe (CPCB-style bands), with a plain-language health explanation.
3. **Personalisation:** the profile and AQI band are combined into a structured prompt for Gemini, so advice changes with who lives at home, how they travel and how bad the air is.
4. **Structured output:** the plan comes in three sections: (A) low-emission daily routine, (B) indoor air quality hacks, (C) sustainable alternatives. Every suggestion carries a short impact note.
5. **Impact Meter:** an overall estimate of smog exposure reduction, daily emissions avoided and a family safety index.
6. **Resilience:** if the Gemini call fails or no API key is set, a rule-based engine produces a safe plan, so the family always gets advice.

## ⚙️ How the Solution Works

1. The user fills in the profile and AQI on the web page (Hindi or English).
2. The browser sends the validated request to the Node.js server.
3. The server calls the Gemini API (`gemini-3.1-flash-lite`, with an ordered list of fallback models).
4. The response is validated and rendered as the Impact Meter plus the three plan sections.
5. If the AI call fails, the rule-based fallback plan is shown instead.
6. The user can copy the plan or print / save it as PDF.

## ✨ Core Features

- **Family and lifestyle profile:** city chips or custom city, vulnerable-member cards, commute mode, home type.
- **Dual AQI input:** numeric field and slider kept in sync, quick presets (Good 40, Moderate 85, Poor 160, Very Poor 260, Severe 385) and colour-coded health explainer.
- **GenAI daily plan:** three sections tailored to the profile.
- **Impact Meter:** exposure reduction, emissions avoided, safety index, plus a clear "rough estimate" note.
- **Bilingual UI and output:** one-click Hindi / English toggle.
- **Utilities:** copy plan, print / save as PDF.
- **Safety:** medical disclaimer at the top and bottom of the page.

## 📌 Assumptions

- The AQI is entered by the user. There is no live AQI feed, so advice is only as accurate as that number.
- Impact figures (exposure drop, CO₂e) are rough estimates based on general public health guidance, not lab measurements.
- Advice is general guidance for families, not medical advice.
- Safe-hour suggestions are general patterns (for example, avoiding early-morning peaks) and may vary by city.

## 🛠️ Tech Stack and Security

- **Frontend:** HTML5, responsive CSS3 (mobile-first), vanilla JavaScript (ES6+).
- **Backend:** Node.js HTTP server.
- **AI:** Google Gemini API.
- **Security:**
  - `GEMINI_API_KEY` is read from server-side environment variables and is never sent to the browser or committed to git (`.env` is in `.gitignore`).
  - Input is validated on the client and the server.
  - The app keeps working through the rule-based fallback if the AI is unavailable.

## 🚀 How to Run

1. Copy `.env.example` to `.env` and add your key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Install and start:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000`.

## 📁 File Structure

```
├── .env.example          # Sample environment template
├── .gitignore            # Ignores node_modules, .env, node.exe
├── package.json
├── server.js             # Backend server and Gemini API proxy
├── README.md
└── public/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── aqi-data.js   # AQI bands, colours, thresholds
        └── app.js        # Form logic, API call, UI rendering
```

## ⚕️ Medical Disclaimer

SaansSaaf is for educational and informational use only. It does not provide medical diagnosis or treatment. In case of wheezing, chest tightness or breathing distress, contact a doctor or emergency care immediately.
