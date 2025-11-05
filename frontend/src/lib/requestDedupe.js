// Simple request dedupe helper
// Keeps a map of in-flight promises keyed by a string. If a request for the same key
// is already in progress, callers will receive the same promise instead of issuing
// a duplicate network call.

const inFlight = new Map();

export function dedupe(key, factory) {
  if (!key) return factory();
  const existing = inFlight.get(key);
  if (existing) return existing;

  const p = (async () => {
    try {
      return await factory();
    } finally {
      // remove after settled so subsequent calls can start a fresh request
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p);
  return p;
}

export function clearDedupe(key) {
  inFlight.delete(key);
}

export default { dedupe, clearDedupe };
