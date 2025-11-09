// utils/cache.js
const cache = new Map();
const TTL = 1000 * 60 * 30; // 30 minutes

export function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > TTL) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key, value) {
  cache.set(key, { value, time: Date.now() });
}