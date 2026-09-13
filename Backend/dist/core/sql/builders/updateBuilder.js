import { returnError, returnSuccess, tryCatchErrorToString } from "../../flow/result.js";
import { getTableName, validateSQLFragment } from "../ast/validator.js";
/**
 * 适配 MySQL 的 UPDATE 语句生成器：
 * 1. 使用标准 ? 占位符；
 * 2. 导出无 FOR UPDATE 的行快照获取 SQL；
 * 3. 生成还原旧行快照的撤销闭包。
 */
export function update({ table, targetId, updateData }) {
    try {
        if (!targetId || String(targetId).trim() === "") {
            return returnError("更新和删除操作必须且只能指定 ID 进行");
        }
        const tableName = getTableName(table, true);
        const keys = Object.keys(updateData);
        if (keys.length === 0) {
            return returnError("UPDATE 更新数据不能为空");
        }
        for (const key of keys) {
            const valid = validateSQLFragment(key);
            if (valid.status === 0) {
                return valid;
            }
        }
        const setClauses = [];
        const updateParams = [];
        // MySQL 占位符统一使用 ?
        keys.forEach((key) => {
            setClauses.push(`${key} = ?`);
            updateParams.push(updateData[key]);
        });
        updateParams.push(targetId);
        const lockSql = `SELECT * FROM ${tableName} WHERE id = ?`;
        const updateSql = `UPDATE ${tableName}\nSET ${setClauses.join(", ")}\nWHERE id = ?`;
        const createUndoFn = (oldRowSnapshot) => {
            const restoreKeys = keys.filter((k) => k in oldRowSnapshot);
            if (restoreKeys.length === 0) {
                return {
                    undoSql: "SELECT 1",
                    undoParams: [],
                };
            }
            const restoreSetClauses = restoreKeys.map((k) => `${k} = ?`);
            const restoreParams = restoreKeys.map((k) => oldRowSnapshot[k]);
            restoreParams.push(targetId);
            return {
                undoSql: `UPDATE ${tableName}\nSET ${restoreSetClauses.join(", ")}\nWHERE id = ?`,
                undoParams: restoreParams,
            };
        };
        return returnSuccess({
            tableName,
            targetId,
            lockSql,
            updateSql,
            updateParams,
            createUndoFn,
        });
    }
    catch (error) {
        return returnError(tryCatchErrorToString(error));
    }
}
//# sourceMappingURL=updateBuilder.js.map