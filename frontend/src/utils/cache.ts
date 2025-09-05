/**
 * Cache utilities
 */

/**
 * Generate a cache key from a prefix and a set of parameters.
 * @param prefix - A prefix for the cache key.
 * @param params - An object of parameters to include in the key.
 * @returns A consistent cache key string.
 * 
 * Note: This function uses JSON.stringify to serialize parameter values.
 * For complex objects or arrays, ensure that the stringified representation
 * is consistent and deterministic. Keys are sorted to ensure consistent
 * ordering.
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${prefix}:${paramString}`;
}