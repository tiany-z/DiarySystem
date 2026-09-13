import { EventEmitter } from "events";
import { normalizeTableName } from "../cache/memoryCache.js";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
/**
 * 单进程内置高性能行级锁管理器
 * 替代远程 Redis 分布式锁，以零网络往返、微秒级延迟保障并发安全性与 Saga 补偿撤销一致性
 */
class InMemoryRowLockManager {
    locks = new Map();
    emitter = new EventEmitter();
    constructor() {
        this.emitter.setMaxListeners(2000);
    }
    makeLockKey(table, id) {
        return `lock:${normalizeTableName(table)}:${id}`;
    }
    async acquireRowLock(table, id, lockType, requestId, maxLockAgeMs = 10000) {
        try {
            const lockKey = this.makeLockKey(table, id);
            const now = Date.now();
            const existing = this.locks.get(lockKey);
            if (existing) {
                // 1. 锁超时自愈：超过最大允许持锁时间自动回收
                if (now - existing.lockedAt > existing.maxLockAgeMs) {
                    this.locks.delete(lockKey);
                }
                else if (existing.ownerRequestId === requestId) {
                    // 2. 同一请求内安全重入
                    return returnSuccess(true);
                }
                else {
                    return returnError(`行锁已被请求 [${existing.ownerRequestId}] 占用，类型为 ${existing.lockType}`);
                }
            }
            const state = {
                table,
                id,
                lockType,
                ownerRequestId: requestId,
                lockedAt: now,
                maxLockAgeMs,
            };
            this.locks.set(lockKey, state);
            return returnSuccess(true);
        }
        catch (error) {
            return returnError(`Acquire row lock failed: ${tryCatchErrorToString(error)}`);
        }
    }
    async releaseRowLock(table, id, requestId, isCommitted) {
        try {
            const lockKey = this.makeLockKey(table, id);
            const existing = this.locks.get(lockKey);
            if (!existing) {
                return returnSuccess(true);
            }
            // 仅允许锁持有者释放该锁
            if (existing.ownerRequestId !== requestId) {
                return returnError(`释放行锁失败: 锁持有者不匹配 (当前持有者: ${existing.ownerRequestId}, 释放者: ${requestId})`);
            }
            const lockType = existing.lockType;
            this.locks.delete(lockKey);
            let finalStatus = "ROLLED_BACK";
            if (isCommitted) {
                finalStatus = lockType === "DELETE" ? "COMMITTED_DELETE" : "COMMITTED_UPDATE";
            }
            // 通知所有等待该行锁解锁的异步二段式查询
            this.emitter.emit(lockKey, finalStatus);
            return returnSuccess(true);
        }
        catch (error) {
            return returnError(`Release row lock failed: ${tryCatchErrorToString(error)}`);
        }
    }
    async isRowLocked(table, id) {
        const lockKey = this.makeLockKey(table, id);
        const existing = this.locks.get(lockKey);
        if (!existing)
            return false;
        if (Date.now() - existing.lockedAt > existing.maxLockAgeMs) {
            this.locks.delete(lockKey);
            return false;
        }
        return true;
    }
    async waitForUnlock(table, id, timeoutMs = 3000) {
        try {
            const lockKey = this.makeLockKey(table, id);
            const locked = await this.isRowLocked(table, id);
            if (!locked) {
                return returnSuccess({ unlocked: true, finalStatus: "ROLLED_BACK" });
            }
            return new Promise((resolve) => {
                let timer = null;
                const onUnlock = (status) => {
                    if (timer)
                        clearTimeout(timer);
                    resolve(returnSuccess({ unlocked: true, finalStatus: status }));
                };
                timer = setTimeout(() => {
                    this.emitter.removeListener(lockKey, onUnlock);
                    resolve(returnSuccess({ unlocked: false, finalStatus: "TIMEOUT" }));
                }, timeoutMs);
                this.emitter.once(lockKey, onUnlock);
            });
        }
        catch (error) {
            return returnError(`Wait for unlock failed: ${tryCatchErrorToString(error)}`);
        }
    }
    clearAllLocks() {
        this.locks.clear();
        this.emitter.removeAllListeners();
    }
}
export const RowLockManager = new InMemoryRowLockManager();
//# sourceMappingURL=rowLockManager.js.map