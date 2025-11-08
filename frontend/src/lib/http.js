import { dedupe } from './requestDedupe';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Utility: simple delay for retry logic
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Fetch wrapper with retry and safe JSON parsing
async function fetchWithRetry(fullUrl, options = {}, retries = 3) {
  let attempt = 0;
  let lastErr;
  const baseDelay = 250;

  while (attempt < retries) {
    try {
      const resp = await fetch(fullUrl, options);
      const text = await resp.text();

      let json;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }

      if (resp.ok) return json;

      if ((resp.status === 429 || resp.status >= 500) && attempt < retries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay + Math.random() * 100);
        attempt++;
        continue;
      }

      const err = new Error(`HTTP ${resp.status}`);
      err.status = resp.status;
      err.body = json;
      throw err;
    } catch (err) {
      lastErr = err;
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

// Attach JWT Authorization if available
function withAuthHeaders(headers = {}) {
  const token = localStorage.getItem('auth_token');
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

// ===============================
//   📦 HTTP METHODS
// ===============================

export async function get(pathOrUrl, { signal, headers, dedupeKey } = {}) {
  const fullUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const factory = () =>
    fetchWithRetry(fullUrl, {
      method: 'GET',
      signal,
      headers: withAuthHeaders(headers),
    });
  return dedupe(dedupeKey || `GET:${fullUrl}`, factory);
}

export async function post(pathOrUrl, body, { signal, headers, retries = 3 } = {}) {
  const fullUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const isFormData = body instanceof FormData;

  const options = {
    method: 'POST',
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    headers: withAuthHeaders({
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(headers || {}),
    }),
    signal,
  };

  return await fetchWithRetry(fullUrl, options, retries);
}

export async function put(pathOrUrl, body, { signal, headers, retries = 3 } = {}) {
  const fullUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const isFormData = body instanceof FormData;

  const options = {
    method: 'PUT',
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    headers: withAuthHeaders({
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(headers || {}),
    }),
    signal,
  };

  return await fetchWithRetry(fullUrl, options, retries);
}

export async function del(pathOrUrl, { signal, headers } = {}) {
  const fullUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_URL}${pathOrUrl}`;
  const options = {
    method: 'DELETE',
    headers: withAuthHeaders(headers),
    signal,
  };
  return await fetchWithRetry(fullUrl, options);
}

export const API_BASE = API_URL;
export default { get, post, put, del, API_BASE };
