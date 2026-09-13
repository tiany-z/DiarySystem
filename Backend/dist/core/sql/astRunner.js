import { select as buildSelect } from "./builders/selectBuilder.js";
import { insert as buildInsert } from "./builders/insertBuilder.js";
import { update as buildUpdate } from "./builders/updateBuilder.js";
import { remove } from "./builders/deleteBuilder.js";
import { parameterizeSql } from "./ast/parameterizer.js";
import { executeQuery } from "../db/mysql.js";
import { delKV, mgetKV, setKV } from "../cache/memoryCache.js";
import { RowLockManager } from "../lock/rowLockManager.js";
import { genUUID } from "../crypto/uuid.js";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
/**
 * 将 AST 配置预编译为具备二段式查询、高性能内存缓存、行锁并发控制与 Saga 补偿机制的执行函数
 */
export function compileAstRunFunction(astConfig) {
    const type = astConfig.type;
    if (type === "SELECT") {
        const buildRes = buildSelect(astConfig.compose);
        if (buildRes.status === 0) {
            throw new Error(`Select AST Compile Error: ${buildRes.content}`);
        }
        const { tableName, sql, sqlOnlyId } = buildRes.data;
        return async (params, ctx) => {
            try {
                // 1. 无锁提取 ID 数组 (将 -!!value!!- 替换为 MySQL 的 ? 参数指针)
                const whereValues = Array.isArray(params) ? params : (params?.whereParams || []);
                const paramRes = parameterizeSql(sqlOnlyId, whereValues);
                if (paramRes.status === 0)
                    return returnError(paramRes.content);
                const { parameterizedSql, params: boundParams } = paramRes.data;
                const idRowsRes = await executeQuery(parameterizedSql, boundParams);
                if (idRowsRes.status === 0)
                    return returnError(idRowsRes.content);
                const ids = idRowsRes.data.map((r) => r.id).filter((id) => id !== undefined);
                if (ids.length === 0)
                    return returnSuccess([]);
                // 2. 锁等待与 COMMITTED_DELETE 二次校判剔除
                const validIds = [];
                for (const id of ids) {
                    if (await RowLockManager.isRowLocked(tableName, id)) {
                        const waitRes = await RowLockManager.waitForUnlock(tableName, id, 3000);
                        if (waitRes.status === 1 && waitRes.data?.finalStatus === "COMMITTED_DELETE") {
                            // 持锁事务已成功删除该记录，从本次查询结果集中剔除
                            continue;
                        }
                    }
                    validIds.push(id);
                }
                if (validIds.length === 0)
                    return returnSuccess([]);
                // 3. Redis 批量 MGET 极速读缓存
                const redisRes = await mgetKV(tableName, validIds);
                const cacheMap = redisRes.status === 1 ? redisRes.data : {};
                const missingIds = [];
                const itemMap = new Map();
                for (const id of validIds) {
                    const strId = String(id);
                    if (cacheMap[strId] !== undefined) {
                        itemMap.set(strId, cacheMap[strId]);
                    }
                    else if (cacheMap[id] !== undefined) {
                        itemMap.set(strId, cacheMap[id]);
                    }
                    else {
                        missingIds.push(id);
                    }
                }
                // 4. 回源 MySQL 批量补全未命中缓存 (使用 WHERE id IN (?, ?) 适配 MySQL) 并回写 Redis 热缓存预热
                if (missingIds.length > 0) {
                    const placeholders = missingIds.map(() => "?").join(", ");
                    const fetchSql = `SELECT * FROM ${tableName} WHERE id IN (${placeholders})`;
                    const dbFetchRes = await executeQuery(fetchSql, missingIds);
                    if (dbFetchRes.status === 1) {
                        for (const row of dbFetchRes.data) {
                            const strId = String(row.id);
                            itemMap.set(strId, row);
                            await setKV(tableName, row.id, row);
                        }
                    }
                }
                // 5. 严格按照 validIds 原排序提取最终结果列表 (通过 String(id) 确保 number/string 主键类型弱匹配)
                const finalResult = validIds.map((id) => itemMap.get(String(id))).filter(Boolean);
                return returnSuccess(finalResult);
            }
            catch (err) {
                return returnError(`Select Run Error: ${tryCatchErrorToString(err)}`);
            }
        };
    }
    if (type === "INSERT") {
        const buildRes = buildInsert(astConfig.compose);
        if (buildRes.status === 0) {
            throw new Error(`Insert AST Compile Error: ${buildRes.content}`);
        }
        const { tableName, sql, createUndoFn, autoInjectedId } = buildRes.data;
        // 探测列定义中是否包含显式 id
        const columns = astConfig.compose?.columns || [];
        const idColIndex = columns.findIndex((c) => c.column === "id");
        return async (params, ctx) => {
            try {
                let runParams = [...params];
                let insertedId;
                if (autoInjectedId) {
                    // 自动生成并注入 UUID 主键 (兼容 RuruChat 原生无须显式传 id 的开发模式)
                    insertedId = genUUID();
                    runParams.unshift(insertedId);
                }
                else if (idColIndex >= 0 && runParams[idColIndex] !== undefined) {
                    // 列定义中显式包含了 id 字段并传参
                    insertedId = runParams[idColIndex];
                }
                const insertRes = await executeQuery(sql, runParams);
                if (insertRes.status === 0)
                    return returnError(insertRes.content);
                // 若尚未确定 ID，尝试从 MySQL 自增结果提取
                if (insertedId === undefined) {
                    insertedId = insertRes.data[0]?.id ?? insertRes.data[0]?.insertId;
                }
                const undoOp = createUndoFn(insertedId);
                // 绑定 withdraw 撤销闭包 (含 Redis 脏缓存擦除)
                const withdraw = async () => {
                    await executeQuery(undoOp.undoSql, undoOp.undoParams).catch(() => { });
                    if (insertedId !== undefined) {
                        await delKV(tableName, insertedId).catch(() => { });
                    }
                };
                if (ctx?.withdrawStack) {
                    ctx.withdrawStack.push(withdraw);
                }
                return returnSuccess({ id: insertedId, withdraw });
            }
            catch (err) {
                return returnError(`Insert Run Error: ${tryCatchErrorToString(err)}`);
            }
        };
    }
    if (type === "UPDATE") {
        return async (params, ctx) => {
            try {
                const table = params?.table || astConfig.compose?.table || astConfig.table;
                const targetId = params?.targetId ?? (typeof params === "object" ? params?.id : undefined);
                const updateData = params?.updateData ?? (typeof params === "object" ? params?.data : undefined);
                const buildRes = buildUpdate({ table, targetId, updateData });
                if (buildRes.status === 0)
                    return returnError(buildRes.content);
                const { tableName, lockSql, updateSql, updateParams, createUndoFn } = buildRes.data;
                const requestId = ctx?.requestId || "req-unknown";
                const lockAcq = await RowLockManager.acquireRowLock(tableName, targetId, "UPDATE", requestId);
                if (lockAcq.status === 0)
                    return returnError(lockAcq.content);
                if (ctx?.lockedRows) {
                    ctx.lockedRows.push({ tableName, targetId, requestId });
                }
                // 执行 SELECT 抓取旧数据快照
                const oldSnapshotRes = await executeQuery(lockSql, [targetId]);
                if (oldSnapshotRes.status === 0)
                    return returnError(oldSnapshotRes.content);
                const oldSnapshot = oldSnapshotRes.data?.[0];
                if (!oldSnapshot) {
                    return returnError(`更新失败: 目标记录不存在 (ID: ${targetId})`);
                }
                // 执行 UPDATE
                const updateRes = await executeQuery(updateSql, updateParams);
                if (updateRes.status === 0)
                    return returnError(updateRes.content);
                // 关键加固：更新成功后即刻作废旧缓存，确保后续 SELECT 读出最新数据
                await delKV(tableName, targetId);
                const undoOp = createUndoFn(oldSnapshot);
                const withdraw = async () => {
                    await executeQuery(undoOp.undoSql, undoOp.undoParams).catch(() => { });
                    await setKV(tableName, targetId, oldSnapshot);
                };
                if (ctx?.withdrawStack) {
                    ctx.withdrawStack.push(withdraw);
                }
                return returnSuccess({ targetId, withdraw });
            }
            catch (err) {
                return returnError(`Update Run Error: ${tryCatchErrorToString(err)}`);
            }
        };
    }
    if (type === "DELETE") {
        return async (params, ctx) => {
            try {
                const table = params?.table || astConfig.compose?.table || astConfig.table;
                const targetId = params?.targetId ?? (typeof params === "object" ? params?.id : params);
                const buildRes = remove({ table, targetId });
                if (buildRes.status === 0)
                    return returnError(buildRes.content);
                const { tableName, lockSql, deleteSql, deleteParams, createUndoFn } = buildRes.data;
                const requestId = ctx?.requestId || "req-unknown";
                const lockAcq = await RowLockManager.acquireRowLock(tableName, targetId, "DELETE", requestId);
                if (lockAcq.status === 0)
                    return returnError(lockAcq.content);
                if (ctx?.lockedRows) {
                    ctx.lockedRows.push({ tableName, targetId, requestId });
                }
                // 执行 SELECT 抓取旧数据快照
                const oldSnapshotRes = await executeQuery(lockSql, [targetId]);
                if (oldSnapshotRes.status === 0)
                    return returnError(oldSnapshotRes.content);
                const oldSnapshot = oldSnapshotRes.data?.[0];
                if (!oldSnapshot) {
                    return returnError(`删除失败: 目标记录不存在 (ID: ${targetId})`);
                }
                // 执行 DELETE
                const delRes = await executeQuery(deleteSql, deleteParams);
                if (delRes.status === 0)
                    return returnError(delRes.content);
                // 关键加固：删除成功后即刻作废该记录缓存
                await delKV(tableName, targetId);
                const undoOp = createUndoFn(oldSnapshot);
                const withdraw = async () => {
                    await executeQuery(undoOp.undoSql, undoOp.undoParams).catch(() => { });
                    await setKV(tableName, targetId, oldSnapshot);
                };
                if (ctx?.withdrawStack) {
                    ctx.withdrawStack.push(withdraw);
                }
                return returnSuccess({ targetId, withdraw });
            }
            catch (err) {
                return returnError(`Delete Run Error: ${tryCatchErrorToString(err)}`);
            }
        };
    }
    return async () => returnError("Unsupported AST Run Type");
}
//# sourceMappingURL=astRunner.js.map