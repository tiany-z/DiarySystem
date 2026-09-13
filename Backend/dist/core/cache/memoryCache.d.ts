import { StandardResult } from "../flow/result.js";
export interface CacheEntry<T = any> {
    value: T;
    expiresAt: number | null;
}
export declare function normalizeTableName(tableName: string): string;
/**
 * 单进程内置高性能内存缓存
 * 专为单实例后端架构设计，免除外部 Redis 依赖，微秒级极速读写，自动 TTL 过期清理
 */
export declare class MemoryCacheImpl {
    private store;
    private hits;
    private misses;
    private cleanupInterval;
    constructor();
    private makeKey;
    private purgeExpired;
    getKV<T = any>(tableName: string, id: string | number): Promise<StandardResult<T | null>>;
    mgetKV<T = any>(tableName: string, ids: Array<string | number>): Promise<StandardResult<Record<string | number, T>>>;
    setKV(tableName: string, id: string | number, value: any, ttlSeconds?: number): Promise<StandardResult<boolean>>;
    delKV(tableName: string, id: string | number): Promise<StandardResult<boolean>>;
    clearTableCache(tableName: string): Promise<StandardResult<boolean>>;
    clearAllCache(): Promise<StandardResult<boolean>>;
    getStats(): {
        totalKeys: number;
        hits: number;
        misses: number;
    };
    close(): void;
}
export declare const MemoryCache: MemoryCacheImpl;
export declare const getKV: <T = any>(tableName: string, id: string | number) => Promise<StandardResult<T | null>>;
export declare const mgetKV: <T = any>(tableName: string, ids: Array<string | number>) => Promise<StandardResult<Record<string | number, T>>>;
export declare const setKV: (tableName: string, id: string | number, value: any, ttlSeconds?: number) => Promise<StandardResult<boolean>>;
export declare const delKV: (tableName: string, id: string | number) => Promise<StandardResult<boolean>>;
export declare const clearTableCache: (tableName: string) => Promise<StandardResult<boolean>>;
export declare const clearAllCache: () => Promise<StandardResult<boolean>>;
//# sourceMappingURL=memoryCache.d.ts.map