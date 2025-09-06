class CacheService {
  private cache = new Map<string, { data: unknown; expiry: number }>();
  private ttl: number;

  constructor(ttl = 60 * 1000) { // 1 minute default TTL
    this.ttl = ttl;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.data as T;
    }
    if (item) {
      this.cache.delete(key);
    }
    return null;
  }

  set<T>(key: string, data: T, ttl = this.ttl): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const stockDataCache = new CacheService(5 * 60 * 1000); // 5 minutes
export const priceHistoryCache = new CacheService(10 * 60 * 1000); // 10 minutes
export const recommendationCache = new CacheService(60 * 60 * 1000); // 1 hour
