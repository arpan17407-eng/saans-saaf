process.env.NODE_ENV = 'test';
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {
  server,
  planCache,
  sanitizePlanRequest,
  generateExpertFallbackPlan
} = require('../server.js');

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

describe('sanitizePlanRequest', () => {
  it('rejects missing or empty city', () => {
    assert.ok(sanitizePlanRequest({ aqi: 200 }).error);
    assert.ok(sanitizePlanRequest({ city: '   ', aqi: 200 }).error);
  });

  it('rejects invalid or out-of-range AQI values', () => {
    assert.ok(sanitizePlanRequest({ city: 'Delhi', aqi: -5 }).error);
    assert.ok(sanitizePlanRequest({ city: 'Delhi', aqi: 1200 }).error);
    assert.ok(sanitizePlanRequest({ city: 'Delhi', aqi: 'abc' }).error);
  });

  it('filters unknown members and normalizes valid payload', () => {
    const res = sanitizePlanRequest({
      city: '  Delhi NCR  ',
      aqi: 342.4,
      members: ['children', 'unknown_group', 'asthma'],
      transport: 'two_wheeler',
      homeType: 'highrise_apt',
      language: 'en'
    });
    assert.equal(res.error, undefined);
    assert.deepEqual(res.value, {
      city: 'Delhi NCR',
      aqi: 342,
      members: ['children', 'asthma'],
      transport: 'two_wheeler',
      homeType: 'highrise_apt',
      language: 'en'
    });
  });
});

describe('generateExpertFallbackPlan', () => {
  it('returns bilingual 3-section plans with impact metrics', () => {
    for (const language of ['hi', 'en']) {
      const plan = generateExpertFallbackPlan({
        city: 'Delhi NCR',
        members: ['children', 'asthma'],
        transport: 'two_wheeler',
        homeType: 'highrise_apt',
        aqi: 380,
        language
      });

      assert.ok(plan.impact.exposureReduction);
      assert.ok(plan.impact.emissionsSaved);
      assert.equal(plan.sectionA.items.length, 3);
      assert.equal(plan.sectionB.items.length, 3);
      assert.equal(plan.sectionC.items.length, 3);
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

  it('GET /api/health returns 200 with security headers', async () => {
    const res = await request(port, 'GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
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

  it('POST /api/generate-plan validates bad requests with 400', async () => {
    const res = await request(
      port,
      'POST',
      '/api/generate-plan',
      JSON.stringify({ city: '', aqi: -1 }),
      { 'Content-Type': 'application/json' }
    );
    assert.equal(res.status, 400);
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
    const firstJson = JSON.parse(first.body.toString('utf8'));
    assert.ok(firstJson.sectionA && firstJson.sectionB && firstJson.sectionC);

    const second = await request(port, 'POST', '/api/generate-plan', payload, headers);
    assert.equal(second.status, 200);
    assert.equal(second.headers['x-cache'], 'HIT');
  });
});
