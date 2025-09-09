interface CacheItem<T> {
  data: T;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // メモリ使用量の推定
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  totalSize: number; // 全体のメモリ使用量推定
}

class CacheService {
  private cache = new Map<string, CacheItem<unknown>>();
  private ttl: number;
  private maxSize: number;
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttl = 60 * 1000, maxSize = 1000) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.startPeriodicCleanup();
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.expiry <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // アクセス統計を更新
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return item.data as T;
  }

  set<T>(key: string, data: T, ttl = this.ttl): void {
    const now = Date.now();
    const size = this.estimateSize(data);
    
    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    const cacheItem: CacheItem<T> = {
      data,
      expiry: now + ttl,
      accessCount: 0,
      lastAccessed: now,
      size
    };

    this.cache.set(key, cacheItem);
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiry <= Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.size, 0);
    
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total === 0 ? 0 : this.stats.hits / total;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      totalSize
    };
  }

  // メモ化機能付きの非同期getter
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl = this.ttl
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await factory();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // エラーをキャッシュしない
      throw error;
    }
  }

  // バッチ操作
  setMultiple<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  getMultiple<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });
    return result;
  }

  // データサイズの推定
  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // 文字あたり2バイトと仮定
    } catch {
      return 100; // JSON化できない場合のデフォルト
    }
  }

  // LFU（Least Frequently Used）による削除
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastAccess = Infinity;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      // 期限切れを優先的に削除
      if (item.expiry <= Date.now()) {
        this.cache.delete(key);
        return;
      }

      if (item.accessCount < leastAccess || 
          (item.accessCount === leastAccess && item.lastAccessed < oldestTime)) {
        leastUsedKey = key;
        leastAccess = item.accessCount;
        oldestTime = item.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  // 定期的なクリーンアップ
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 1分ごと
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.expiry <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Cleaned up ${expiredKeys.length} expired items`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// 特化型キャッシュサービス
export const stockDataCache = new CacheService(2 * 60 * 1000, 500); // 2分, 500アイテム
export const priceHistoryCache = new CacheService(10 * 60 * 1000, 200); // 10分, 200アイテム  
export const recommendationCache = new CacheService(60 * 60 * 1000, 100); // 1時間, 100アイテム
export const mlPredictionCache = new CacheService(5 * 60 * 1000, 50); // 5分, 50アイテム
export const realtimePriceCache = new CacheService(30 * 1000, 1000); // 30秒, 1000アイテム

// キャッシュ統計の表示（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  const debugCacheStats = () => {
    console.group('[Cache Statistics]');
    console.log('Stock Data:', stockDataCache.getStats());
    console.log('Price History:', priceHistoryCache.getStats());
    console.log('Recommendations:', recommendationCache.getStats());
    console.log('ML Predictions:', mlPredictionCache.getStats());
    console.log('Realtime Prices:', realtimePriceCache.getStats());
    console.groupEnd();
  };

  // 30秒ごとに統計を表示
  setInterval(debugCacheStats, 30000);

  // グローバルに露出（デバッグ用）
  (window as any).cacheDebug = {
    stockData: stockDataCache,
    priceHistory: priceHistoryCache,
    recommendations: recommendationCache,
    mlPredictions: mlPredictionCache,
    realtimePrice: realtimePriceCache,
    showStats: debugCacheStats
  };
}

// エクスポート時のクリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stockDataCache.destroy();
    priceHistoryCache.destroy();
    recommendationCache.destroy();
    mlPredictionCache.destroy();
    realtimePriceCache.destroy();
  });
}
