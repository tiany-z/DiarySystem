import { Redis, RedisOptions } from "ioredis";
import { StandardResult } from "../flow/result.js";
export declare function initRedisClient(options?: RedisOptions): StandardResult<Redis>;
export declare function getRedisClient(): Redis | null;
export declare function normalizeTableName(tableName: string): string;
export declare function getKV<T = any>(tableName: string, id: string | number): Promise<StandardResult<T | null>>;
export declare function mgetKV<T = any>(tableName: string, ids: Array<string | number>): Promise<StandardResult<Record<string | number, T>>>;
export declare function setKV(tableName: string, id: string | number, value: any, ttlSeconds?: number): Promise<StandardResult<boolean>>;
export declare function delKV(tableName: string, id: string | number): Promise<StandardResult<boolean>>;
export declare function getRedisSubClient(): Redis | null;
export declare function setLockKV(key: string, payloadJson: string, ttlMs: number): Promise<StandardResult<boolean>>;
export declare function releaseLockLua(key: string, ownerRequestId: string): Promise<StandardResult<string | null>>;
export declare function publishUnlockEvent(channel: string, message: string): Promise<StandardResult<number>>;
export declare function closeRedisClient(): Promise<StandardResult<boolean>>;
//# sourceMappingURL=redis.d.ts.map