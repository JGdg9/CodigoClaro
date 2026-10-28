'use strict';

const { isIP } = require('node:net');

/** Creates a bounded per-process limiter keyed by client address and route. */
function createRateLimiter({ now = Date.now, maxEntries = 5000, trustCloudflare = false } = {}) {
  const requests = new Map();
  const requestedCapacity = Number(maxEntries);
  const capacity = Number.isSafeInteger(requestedCapacity) && requestedCapacity > 0
    ? requestedCapacity
    : 5000;

  return function throttled(req, limit = 12, windowMs = 15 * 60 * 1000) {
    const forwardedAddress = trustCloudflare && typeof req.headers?.['cf-connecting-ip'] === 'string'
      ? req.headers['cf-connecting-ip'].trim()
      : '';
    const address = isIP(forwardedAddress)
      ? forwardedAddress
      : req.socket?.remoteAddress || 'unknown';
    const route = String(req.url || '/').split('?', 1)[0];
    const key = `${address}|${route}`;
    const current = now();
    let bucket = requests.get(key);

    if (bucket && current - bucket.start > bucket.windowMs) {
      requests.delete(key);
      bucket = undefined;
    }

    if (!bucket) {
      if (requests.size >= capacity) {
        for (const [entryKey, entry] of requests) {
          if (current - entry.start > entry.windowMs) requests.delete(entryKey);
        }
      }
      if (requests.size >= capacity) return true;
      bucket = { start: current, count: 0, windowMs };
      requests.set(key, bucket);
    }

    bucket.count += 1;
    return bucket.count > limit;
  };
}

module.exports = { createRateLimiter };
