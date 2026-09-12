import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../../flow/result.js";
import { getTableName } from "../ast/validator.js";
import type { DeleteBuildResult, DeleteCompose, UndoOperation } from "../type.js";

/**
 * 适配 MySQL 的 DELETE 语句生成器：
 * 1. 使用标准 ? 占位符；
 * 2. 导出无 FOR UPDATE 的行快照获取 SQL；
 * 3. 生成基于旧行快照插回数据的撤销闭包。
 */
export function remove({ table, targetId }: DeleteCompose): StandardResult<DeleteBuildResult> {
  try {
    if (!targetId || String(targetId).trim() === "") {
      return returnError("更新和删除操作必须且只能指定 ID 进行");
    }

    const tableName = getTableName(table, true);

    const lockSql = `SELECT * FROM ${tableName} WHERE id = ?`;
    const deleteSql = `DELETE FROM ${tableName}\nWHERE id = ?`;
    const deleteParams = [targetId];

    const createUndoFn = (deletedRowSnapshot: Record<string, any>): UndoOperation => {
      const keys = Object.keys(deletedRowSnapshot);
      if (keys.length === 0) {
        return {
          undoSql: "SELECT 1",
          undoParams: [],
        };
      }
      const valuePlaceholders = keys.map(() => "?").join(", ");
      const undoParams = keys.map((k) => deletedRowSnapshot[k]);

      return {
        undoSql: `INSERT INTO ${tableName} (${keys.join(", ")})\nVALUES (${valuePlaceholders})`,
        undoParams,
      };
    };

    return returnSuccess<DeleteBuildResult>({
      tableName,
      targetId,
      lockSql,
      deleteSql,
      deleteParams,
      createUndoFn,
    });
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}
