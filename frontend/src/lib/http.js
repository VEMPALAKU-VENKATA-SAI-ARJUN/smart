import { dedupe } from "./requestDedupe";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Sleep utility for retry backoff */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Fetch wrapper with:
 * - Retry logic for network / 5xx / 429 errors
 * - Automatic JSON parsing (failsafe)
 * - No extra wrapping (returns backend JSON directly)
 */
async function fetchWithRetry(fullUrl, options = {}, retries = 3) {
  let attempt = 0;
  let lastErr;
  const baseDelay = 250; // ms

  while (attempt < retries) {
    try {
      const resp = await fetch(fullUrl, options);
      const text = await resp.text();

      // Try to parse JSON safely
      let json;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }

      // ✅ Return actual backend JSON if success
      if (resp.ok) return json;

      // Retry for rate-limit or server errors
      if ((resp.status === 429 || resp.status >= 500) && attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay + Math.random() * 100);
        attempt++;
        continue;
      }

      // Non-retryable error → throw
      const err = new Error(`HTTP ${resp.status}`);
      err.status = resp.status;
      err.body = json;
      throw err;
    } catch (err) {
      lastErr = err;

      // Retry on fetch/network errors
      if (attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay + Math.random() * 100);
        attempt++;
        continue;
      }

      throw lastErr;
    }
  }

  throw lastErr;
}

/** Automatically attaches auth token (if present) */
function withAuthHeaders(headers = {}) {
  const token = localStorage.getItem("auth_token");
  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;
}

/** GET request (deduplicated automatically) */
export async function get(pathOrUrl, { signal, headers, dedupeKey } = {}) {
  const fullUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const factory = () =>
    fetchWithRetry(fullUrl, {
      method: "GET",
      signal,
      headers: withAuthHeaders(headers),
    });

  return dedupe(dedupeKey || `GET:${fullUrl}`, factory);
}

/** POST request */
export async function post(pathOrUrl, body, { signal, headers, retries = 3 } = {}) {
  const fullUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const options = {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: withAuthHeaders({
      "Content-Type": "application/json",
      ...(headers || {}),
    }),
    signal,
  };
  return await fetchWithRetry(fullUrl, options, retries);
}

/** PUT request */
export async function put(pathOrUrl, body, { signal, headers, retries = 3 } = {}) {
  const fullUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const options = {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
    headers: withAuthHeaders({
      "Content-Type": "application/json",
      ...(headers || {}),
    }),
    signal,
  };
  return await fetchWithRetry(fullUrl, options, retries);
}

/** DELETE request */
export async function del(pathOrUrl, { signal, headers } = {}) {
  const fullUrl = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const options = {
    method: "DELETE",
    headers: withAuthHeaders(headers),
    signal,
  };
  return await fetchWithRetry(fullUrl, options);
}

export const API_BASE = API_URL;

export default { get, post, put, del, API_BASE };
