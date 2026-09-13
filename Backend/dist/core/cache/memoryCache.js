import { returnSuccess } from "../flow/result.js";
export function normalizeTableName(tableName) {
    if (!tableName)
        return "";
    let clean = tableName.replace(/[`"']/g, "");
    if (clean.includes("."))
        clean = clean.split(".").pop();
    return clean.trim().toLowerCase();
}
/**
 * 单进程内置高性能内存缓存
 * 专为单实例后端架构设计，免除外部 Redis 依赖，微秒级极速读写，自动 TTL 过期清理
 */
export class MemoryCacheImpl {
    store = new Map();
    hits = 0;
    misses = 0;
    cleanupInterval = null;
    constructor() {
        // 定期（每 60 秒）自动惰性清理过期缓存项
        this.cleanupInterval = setInterval(() => {
            this.purgeExpired();
        }, 60000);
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    makeKey(tableName, id) {
        return `${normalizeTableName(tableName)}:${id}`;
    }
    purgeExpired() {
        const now = Date.now();
        for (const [k, v] of this.store.entries()) {
            if (v.expiresAt !== null && now > v.expiresAt) {
                this.store.delete(k);
            }
        }
    }
    async getKV(tableName, id) {
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
    async mgetKV(tableName, ids) {
        const resultMap = {};
        const now = Date.now();
        for (const id of ids) {
            const key = this.makeKey(tableName, id);
            const entry = this.store.get(key);
            if (entry) {
                if (entry.expiresAt !== null && now > entry.expiresAt) {
                    this.store.delete(key);
                    this.misses++;
                }
                else {
                    resultMap[id] = entry.value;
                    this.hits++;
                }
            }
            else {
                this.misses++;
            }
        }
        return returnSuccess(resultMap);
    }
    async setKV(tableName, id, value, ttlSeconds = 86400) {
        const key = this.makeKey(tableName, id);
        const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
        this.store.set(key, { value, expiresAt });
        return returnSuccess(true);
    }
    async delKV(tableName, id) {
        const key = this.makeKey(tableName, id);
        this.store.delete(key);
        return returnSuccess(true);
    }
    async clearTableCache(tableName) {
        const prefix = `${normalizeTableName(tableName)}:`;
        for (const k of this.store.keys()) {
            if (k.startsWith(prefix)) {
                this.store.delete(k);
            }
        }
        return returnSuccess(true);
    }
    async clearAllCache() {
        this.store.clear();
        this.hits = 0;
        this.misses = 0;
        return returnSuccess(true);
    }
    getStats() {
        return {
            totalKeys: this.store.size,
            hits: this.hits,
            misses: this.misses,
        };
    }
    close() {
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
//# sourceMappingURL=memoryCache.js.map