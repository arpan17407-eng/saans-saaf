const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { AQI_LEVELS, getAqiDetails } = require('../public/js/aqi-data.js');

describe('AQI Data & Thresholds', () => {
  it('defines all 5 CPCB/WHO AQI categories in ascending order', () => {
    assert.equal(AQI_LEVELS.length, 5);
    assert.deepEqual(
      AQI_LEVELS.map(l => l.category),
      ['good', 'moderate', 'poor', 'verypoor', 'severe']
    );
  });

  it('maps boundary AQI values to the exact expected categories', () => {
    assert.equal(getAqiDetails(0).category, 'good');
    assert.equal(getAqiDetails(50).category, 'good');
    assert.equal(getAqiDetails(51).category, 'moderate');
    assert.equal(getAqiDetails(100).category, 'moderate');
    assert.equal(getAqiDetails(101).category, 'poor');
    assert.equal(getAqiDetails(200).category, 'poor');
    assert.equal(getAqiDetails(201).category, 'verypoor');
    assert.equal(getAqiDetails(300).category, 'verypoor');
    assert.equal(getAqiDetails(301).category, 'severe');
    assert.equal(getAqiDetails(999).category, 'severe');
  });

  it('falls back safely for non-numeric or out-of-range values', () => {
    assert.equal(getAqiDetails(NaN).category, 'good');
    assert.equal(getAqiDetails(15000).category, 'severe');
  });

  it('provides bilingual titles, descriptions, and health tags for every level', () => {
    for (const level of AQI_LEVELS) {
      assert.ok(level.title.hi && level.title.en);
      assert.ok(level.desc.hi && level.desc.en);
      assert.ok(level.healthTag.hi && level.healthTag.en);
    }
  });
});
