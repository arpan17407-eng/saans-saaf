'use strict';

/**
 * Bounded in-memory TTL/LRU cache for generated plans to reduce latency and API quota usage.
 */
class PlanCache {
  /**
   * @param {number} maxEntries Maximum cached entries before oldest is evicted.
   * @param {number} ttlMs Time-to-live in milliseconds.
   */
  constructor(maxEntries = 100, ttlMs = 15 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  /**
   * Build a deterministic cache key with AQI bucketed in steps of 25.
   * @param {object} params
   * @returns {string}
   */
  buildKey({ city, members = [], transport, homeType, aqi, language }) {
    const normalizedMembers = [...members].sort().join(',');
    const aqiBucket = Math.floor(aqi / 25) * 25;
    return `${city.toLowerCase()}|${normalizedMembers}|${transport}|${homeType}|${aqiBucket}|${language}`;
  }

  /**
   * Retrieve a non-expired entry and refresh its LRU position.
   * @param {string} key
   * @returns {object|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * Store a value in the cache, evicting the oldest entry if at capacity.
   * @param {string} key
   * @param {object} value
   */
  set(key, value) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  /**
   * Clear all cached entries.
   */
  clear() {
    this.store.clear();
  }
}

module.exports = { PlanCache };
