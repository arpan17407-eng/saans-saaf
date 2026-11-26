'use strict';

/**
 * Expert Rule-Based Plan Generator (Local Intelligent Fallback).
 * Produces bilingual 3-section smog mitigation plans when Gemini is unavailable.
 * @param {object} params
 * @returns {object}
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

module.exports = { generateExpertFallbackPlan };
