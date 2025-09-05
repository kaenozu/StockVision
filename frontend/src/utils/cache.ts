/**
 * Recursively sort object keys to ensure consistent JSON.stringify output.
 * @param obj - The object to sort.
 * @returns A new object with sorted keys.
 */
function sortObjectKeys(obj: any): any {
  // Date オブジェクトなどの特殊なオブジェクトをそのまま返す
  if (obj === null || typeof obj !== 'object' || Object.prototype.toString.call(obj) !== '[object Object]') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = sortObjectKeys(obj[key]);
  }
  return sortedObj;
}

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
    .map(key => {
      const sortedValue = sortObjectKeys(params[key]);
      return `${key}=${JSON.stringify(sortedValue)}`;
    })
    .join('&');
  return `${prefix}:${paramString}`;
}