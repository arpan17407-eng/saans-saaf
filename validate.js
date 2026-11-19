'use strict';

const CITY_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.,'’-]{1,59}$/u;
const TOKEN_PATTERN = /^[a-z0-9_-]{1,30}$/i;
const AQI_MIN = 0;
const AQI_MAX = 999;
const MAX_MEMBERS = 10;
const LANGUAGES = ['hi', 'en'];

function validatePlanRequest(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Request body must be a JSON object.'] };
  }

  const errors = [];

  const city = typeof body.city === 'string' ? body.city.trim() : '';
  if (!city) errors.push('City is required.');
  else if (!CITY_PATTERN.test(city)) {
    errors.push("City must be 2-60 characters: letters, spaces and . , ' - only.");
  }

  let aqi = NaN;
  if (typeof body.aqi === 'number') aqi = body.aqi;
  else if (typeof body.aqi === 'string' && body.aqi.trim() !== '') aqi = Number(body.aqi);
  if (!Number.isFinite(aqi) || aqi < AQI_MIN || aqi > AQI_MAX) {
    errors.push(`AQI must be a number between ${AQI_MIN} and ${AQI_MAX}.`);
  } else {
    aqi = Math.round(aqi);
  }

  let members = [];
  if (body.members !== undefined) {
    if (!Array.isArray(body.members) || body.members.length > MAX_MEMBERS ||
        !body.members.every(m => typeof m === 'string' && TOKEN_PATTERN.test(m))) {
      errors.push('Members must be a short list of simple text values.');
    } else {
      members = [...new Set(body.members)];
    }
  }

  const readToken = (value, label) => {
    if (value === undefined || value === null || value === '') return 'not specified';
    if (typeof value !== 'string' || !TOKEN_PATTERN.test(value)) {
      errors.push(`${label} has an invalid value.`);
      return 'not specified';
    }
    return value;
  };
  const transport = readToken(body.transport, 'Transport');
  const homeType = readToken(body.homeType, 'Home type');

  const language = body.language === undefined ? 'hi' : body.language;
  if (!LANGUAGES.includes(language)) errors.push("Language must be 'hi' or 'en'.");

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { city, aqi, members, transport, homeType, language } };
}

module.exports = { validatePlanRequest };
