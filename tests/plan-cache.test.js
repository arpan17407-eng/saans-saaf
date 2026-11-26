'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PlanCache } = require('../lib/plan-cache.js');

describe('PlanCache', () => {
  it('builds deterministic keys independent of member order and city case', () => {
    const cache = new PlanCache();
    const key1 = cache.buildKey({
      city: 'Delhi NCR',
      members: ['elderly', 'children'],
      transport: 'metro',
      homeType: 'highrise',
      aqi: 312,
      language: 'hi'
    });
    const key2 = cache.buildKey({
      city: 'delhi ncr',
      members: ['children', 'elderly'],
      transport: 'metro',
      homeType: 'highrise',
      aqi: 320,
      language: 'hi'
    });
    assert.equal(key1, key2);
  });

  it('evicts the least recently used entry when exceeding maxEntries', () => {
    const cache = new PlanCache(2, 60_000);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.get('a'), 1); // 'a' becomes most recently used
    cache.set('c', 3); // should evict 'b'
    assert.equal(cache.get('b'), null);
    assert.equal(cache.get('a'), 1);
    assert.equal(cache.get('c'), 3);
  });

  it('expires entries after ttlMs and clears cleanly', async () => {
    const cache = new PlanCache(10, 20);
    cache.set('temp', { ok: true });
    assert.deepEqual(cache.get('temp'), { ok: true });
    await new Promise(resolve => setTimeout(resolve, 35));
    assert.equal(cache.get('temp'), null);

    cache.set('keep', { ok: true });
    cache.clear();
    assert.equal(cache.get('keep'), null);
  });
});
