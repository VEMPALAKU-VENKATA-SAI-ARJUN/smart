/**
 * Rate-Limited Fetch Utility
 * Handles 429 errors with exponential backoff and caching
 */

const cache = new Map();
const rateLimitedEndpoints = new Map();
const CACHE_DURATION = 60000; // 1 minute cache
const MIN_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 300000; // 5 minutes

/**
 * Check if an endpoint is currently rate limited
 */
const isRateLimited = (endpoint) => {
  const limitInfo = rateLimitedEndpoints.get(endpoint);
  if (!limitInfo) return false;
  
  const now = Date.now();
  if (now < limitInfo.retryAfter) {
    return true;
  }
  
  // Rate limit expired, remove it
  rateLimitedEndpoints.delete(endpoint);
  return false;
};

/**
 * Mark an endpoint as rate limited
 */
const markRateLimited = (endpoint, retryAfter = null) => {
  const now = Date.now();
  const existingLimit = rateLimitedEndpoints.get(endpoint);
  
  // Calculate exponential backoff
  let delay = MIN_RETRY_DELAY;
  if (existingLimit) {
    delay = Math.min(existingLimit.delay * 2, MAX_RETRY_DELAY);
  }
  
  // Use Retry-After header if provided
  if (retryAfter) {
    delay = parseInt(retryAfter) * 1000;
  }
  
  rateLimitedEndpoints.set(endpoint, {
    retryAfter: now + delay,
    delay: delay
  });
  
  console.warn(`⏱️ Rate limited: ${endpoint}. Retry after ${delay / 1000}s`);
};

/**
 * Get cached data if available and not expired
 */
const getCached = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Set cached data
 */
const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Fetch with rate limiting and caching
 */
export const rateLimitedFetch = async (url, options = {}) => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  // Check cache first
  if (!options.skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Check if endpoint is rate limited
  if (isRateLimited(url)) {
    const limitInfo = rateLimitedEndpoints.get(url);
    const waitTime = Math.ceil((limitInfo.retryAfter - Date.now()) / 1000);
    console.warn(`⏱️ Skipping rate-limited endpoint: ${url}. Retry in ${waitTime}s`);
    
    // Return cached data if available, even if expired
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    
    throw new Error(`Rate limited. Retry after ${waitTime}s`);
  }
  
  try {
    const response = await fetch(url, options);
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      markRateLimited(url, retryAfter);
      
      // Return cached data if available
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
      
      throw new Error('Rate limited');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache successful response
    setCache(cacheKey, data);
    
    return data;
  } catch (error) {
    // If fetch fails, try to return cached data
    const cached = cache.get(cacheKey);
    if (cached) {
      console.warn(`Using cached data for ${url} due to error:`, error.message);
      return cached.data;
    }
    
    throw error;
  }
};

/**
 * Clear cache for a specific endpoint or all
 */
export const clearCache = (url = null) => {
  if (url) {
    // Clear specific endpoint
    for (const key of cache.keys()) {
      if (key.startsWith(url)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all cache
    cache.clear();
  }
};

/**
 * Clear rate limit for a specific endpoint
 */
export const clearRateLimit = (url) => {
  rateLimitedEndpoints.delete(url);
};

/**
 * Get rate limit status
 */
export const getRateLimitStatus = () => {
  const status = {};
  for (const [endpoint, info] of rateLimitedEndpoints.entries()) {
    const now = Date.now();
    status[endpoint] = {
      retryAfter: Math.ceil((info.retryAfter - now) / 1000),
      isActive: now < info.retryAfter
    };
  }
  return status;
};

export default rateLimitedFetch;
