'use strict';

/**
 * server.js
 * Backend HTTP server for SaansSaaf - Urban Air Quality Assistant.
 * Uses native Node.js HTTP with gzip compression, in-memory TTL/LRU caching,
 * strict input validation, security headers, and server-side Gemini API proxy.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

const { validatePlanRequest } = require('./validate');
const { PlanCache } = require('./lib/plan-cache');
const { callGeminiAPI } = require('./lib/gemini-client');
const { generateExpertFallbackPlan } = require('./lib/fallback-plan');

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
const MAX_BODY_BYTES = 64 * 1024;

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
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'"
].join('; ');

const planCache = new PlanCache();

function hasActiveGeminiKey() {
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '' && GEMINI_API_KEY !== 'your_gemini_api_key_here');
}

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
 * @param {http.IncomingMessage} req
 * @param {number} maxBytes
 * @returns {Promise<object>}
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
 * Handle POST /api/generate-plan requests with validation, caching, and fallback.
 */
async function handleGeneratePlan(req, res) {
  try {
    const rawBody = await readJsonBody(req);
    const validation = validatePlanRequest(rawBody);

    if (!validation.ok) {
      return sendJson(res, 400, {
        error: 'Invalid input',
        message: validation.errors[0],
        errors: validation.errors
      });
    }

    const params = validation.value;
    const cacheKey = planCache.buildKey(params);
    const cached = planCache.get(cacheKey);
    if (cached) {
      return sendJson(res, 200, cached, { 'X-Cache': 'HIT' });
    }

    if (hasActiveGeminiKey()) {
      try {
        const { plan: aiPlan, model: successfulModel } = await callGeminiAPI(params, GEMINI_API_KEY);
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
 * Serve static files from public/ with path traversal protection, gzip, and cache headers.
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

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP_HEADER);

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

module.exports = { server, planCache };
