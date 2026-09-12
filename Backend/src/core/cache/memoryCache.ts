import { returnSuccess, StandardResult } from "../flow/result.js";

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number | null;
}

export function normalizeTableName(tableName: string): string {
  if (!tableName) return "";
  let clean = tableName.replace(/[`"']/g, "");
  if (clean.includes(".")) clean = clean.split(".").pop()!;
  return clean.trim().toLowerCase();
}

/**
 * 单进程内置高性能内存缓存
 * 专为单实例后端架构设计，免除外部 Redis 依赖，微秒级极速读写，自动 TTL 过期清理
 */
export class MemoryCacheImpl {
  private store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 定期（每 60 秒）自动惰性清理过期缓存项
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private makeKey(tableName: string, id: string | number): string {
    return `${normalizeTableName(tableName)}:${id}`;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (v.expiresAt !== null && now > v.expiresAt) {
        this.store.delete(k);
      }
    }
  }

  public async getKV<T = any>(tableName: string, id: string | number): Promise<StandardResult<T | null>> {
    const key = this.makeKey(tableName, id);
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return returnSuccess(null);
    }
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return returnSuccess(null);
    }
    this.hits++;
    return returnSuccess(entry.value);
  }

  public async mgetKV<T = any>(
    tableName: string,
    ids: Array<string | number>
  ): Promise<StandardResult<Record<string | number, T>>> {
    const resultMap: Record<string | number, T> = {};
    const now = Date.now();
    for (const id of ids) {
      const key = this.makeKey(tableName, id);
      const entry = this.store.get(key);
      if (entry) {
        if (entry.expiresAt !== null && now > entry.expiresAt) {
          this.store.delete(key);
          this.misses++;
        } else {
          resultMap[id] = entry.value;
          this.hits++;
        }
      } else {
        this.misses++;
      }
    }
    return returnSuccess(resultMap);
  }

  public async setKV(
    tableName: string,
    id: string | number,
    value: any,
    ttlSeconds: number = 86400
  ): Promise<StandardResult<boolean>> {
    const key = this.makeKey(tableName, id);
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return returnSuccess(true);
  }

  public async delKV(tableName: string, id: string | number): Promise<StandardResult<boolean>> {
    const key = this.makeKey(tableName, id);
    this.store.delete(key);
    return returnSuccess(true);
  }

  public async clearTableCache(tableName: string): Promise<StandardResult<boolean>> {
    const prefix = `${normalizeTableName(tableName)}:`;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
    return returnSuccess(true);
  }

  public async clearAllCache(): Promise<StandardResult<boolean>> {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    return returnSuccess(true);
  }

  public getStats() {
    return {
      totalKeys: this.store.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

export const MemoryCache = new MemoryCacheImpl();
export const getKV = MemoryCache.getKV.bind(MemoryCache);
export const mgetKV = MemoryCache.mgetKV.bind(MemoryCache);
export const setKV = MemoryCache.setKV.bind(MemoryCache);
export const delKV = MemoryCache.delKV.bind(MemoryCache);
export const clearTableCache = MemoryCache.clearTableCache.bind(MemoryCache);
export const clearAllCache = MemoryCache.clearAllCache.bind(MemoryCache);
