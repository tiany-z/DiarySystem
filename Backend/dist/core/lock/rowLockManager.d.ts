import { StandardResult } from "../flow/result.js";
export interface RowLockState {
    table: string;
    id: string | number;
    lockType: "UPDATE" | "DELETE";
    ownerRequestId: string;
    lockedAt: number;
    maxLockAgeMs: number;
}
export type UnlockStatus = "COMMITTED_UPDATE" | "COMMITTED_DELETE" | "ROLLED_BACK" | "TIMEOUT";
export interface LockWaitResult {
    unlocked: boolean;
    finalStatus: UnlockStatus;
}
/**
 * 单进程内置高性能行级锁管理器
 * 替代远程 Redis 分布式锁，以零网络往返、微秒级延迟保障并发安全性与 Saga 补偿撤销一致性
 */
declare class InMemoryRowLockManager {
    private locks;
    private emitter;
    constructor();
    private makeLockKey;
    acquireRowLock(table: string, id: string | number, lockType: "UPDATE" | "DELETE", requestId: string, maxLockAgeMs?: number): Promise<StandardResult<boolean>>;
    releaseRowLock(table: string, id: string | number, requestId: string, isCommitted: boolean): Promise<StandardResult<boolean>>;
    isRowLocked(table: string, id: string | number): Promise<boolean>;
    waitForUnlock(table: string, id: string | number, timeoutMs?: number): Promise<StandardResult<LockWaitResult>>;
    clearAllLocks(): void;
}
export declare const RowLockManager: InMemoryRowLockManager;
export {};
//# sourceMappingURL=rowLockManager.d.ts.map