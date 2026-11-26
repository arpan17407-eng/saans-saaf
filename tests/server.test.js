'use strict';

process.env.NODE_ENV = 'test';
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { server, planCache } = require('../server.js');
const { generateExpertFallbackPlan } = require('../lib/fallback-plan.js');

function request(port, method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method, headers },
      res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

describe('generateExpertFallbackPlan', () => {
  it('returns bilingual 3-section plans across AQI severity tiers', () => {
    for (const language of ['hi', 'en']) {
      for (const aqi of [80, 220, 380]) {
        const plan = generateExpertFallbackPlan({
          city: 'Delhi NCR',
          members: ['children', 'asthma'],
          transport: 'two_wheeler',
          homeType: 'highrise_apt',
          aqi,
          language
        });

        assert.ok(plan.impact.exposureReduction);
        assert.ok(plan.impact.emissionsSaved);
        assert.equal(plan.sectionA.items.length, 3);
        assert.equal(plan.sectionB.items.length, 3);
        assert.equal(plan.sectionC.items.length, 3);
      }
    }
  });
});

describe('HTTP Server & API Endpoints', () => {
  let port;

  before((_, done) => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  beforeEach(() => {
    planCache.clear();
  });

  it('GET /api/health returns 200 with full security headers', async () => {
    const res = await request(port, 'GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.ok(res.headers['content-security-policy']);
    assert.ok(res.headers['permissions-policy']);
    const json = JSON.parse(res.body.toString('utf8'));
    assert.equal(json.status, 'ok');
    assert.equal(typeof json.hasGeminiKey, 'boolean');
  });

  it('GET / serves index.html with gzip when accepted', async () => {
    const res = await request(port, 'GET', '/', null, { 'Accept-Encoding': 'gzip' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-encoding'], 'gzip');
    assert.match(res.headers['content-type'], /text\/html/);
  });

  it('blocks directory traversal with 403', async () => {
    const res = await request(port, 'GET', '/..%2Fserver.js');
    assert.equal(res.status, 403);
  });

  it('returns 404 for nonexistent static files', async () => {
    const res = await request(port, 'GET', '/does-not-exist.js');
    assert.equal(res.status, 404);
  });

  it('POST /api/generate-plan rejects invalid JSON and bad payloads with 400', async () => {
    const badJson = await request(port, 'POST', '/api/generate-plan', '{bad', {
      'Content-Type': 'application/json'
    });
    assert.equal(badJson.status, 400);

    const badPayload = await request(
      port,
      'POST',
      '/api/generate-plan',
      JSON.stringify({ city: '', aqi: -1 }),
      { 'Content-Type': 'application/json' }
    );
    assert.equal(badPayload.status, 400);
  });

  it('POST /api/generate-plan serves cached response on repeat request', async () => {
    const payload = JSON.stringify({
      city: 'Kanpur',
      members: ['elderly'],
      transport: 'public_transit',
      homeType: 'independent',
      aqi: 250,
      language: 'en'
    });
    const headers = { 'Content-Type': 'application/json' };

    const first = await request(port, 'POST', '/api/generate-plan', payload, headers);
    assert.equal(first.status, 200);
    assert.equal(first.headers['x-cache'], 'MISS');
    const firstJson = JSON.parse(first.body.toString('utf8'));
    assert.ok(firstJson.sectionA && firstJson.sectionB && firstJson.sectionC);

    const second = await request(port, 'POST', '/api/generate-plan', payload, headers);
    assert.equal(second.status, 200);
    assert.equal(second.headers['x-cache'], 'HIT');
  });
});
