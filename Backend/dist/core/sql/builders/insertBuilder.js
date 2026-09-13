import { returnError, returnSuccess, tryCatchErrorToString } from "../../flow/result.js";
import { getTableName } from "../ast/validator.js";
/**
 * 适配 MySQL 的 INSERT 语句生成器：
 * 1. 使用标准 ? 占位符；
 * 2. 移除 PostgreSQL 专用的 RETURNING id 子句；
 * 3. 生成基于 id = ? 的撤销删除闭包。
 */
export function insert({ columns, table, idType }) {
    try {
        if (columns.length === 0) {
            return returnError("插入列列表不能为空");
        }
        const tableNames = [
            ...new Set(columns.map((item) => {
                return getTableName(item.tableNode, true);
            })),
        ];
        if (tableNames.length > 1) {
            return returnError("插入操作只能针对一个表");
        }
        const primaryTableNode = columns[0].tableNode;
        const tableName = table ? getTableName(table, true) : tableNames[0];
        let columnNames = [
            ...new Set(columns.map((item) => {
                return `${item.column}`;
            })),
        ];
        if (columnNames.length !== columns.length) {
            return returnError("存在重复的列名");
        }
        // 探测是否需要自动注入 UUID 主键 (当未指定 id 列且未显式声明为 auto_increment/manual 时自动启用)
        const hasExplicitId = columnNames.includes("id");
        const autoInjectedId = !hasExplicitId && idType !== "auto_increment" && idType !== "manual";
        if (autoInjectedId) {
            columnNames = ["id", ...columnNames];
        }
        // MySQL 占位符统一使用 ?
        const valuePlaceholders = columnNames.map(() => "?").join(", ");
        const sql = `INSERT INTO ${tableName} (${columnNames.join(", ")})\nVALUES (${valuePlaceholders})`;
        // MySQL 撤销删除同样使用 ?
        const createUndoFn = (insertedId) => {
            return {
                undoSql: `DELETE FROM ${tableName} WHERE id = ?`,
                undoParams: [insertedId],
            };
        };
        return returnSuccess({
            tableName,
            sql,
            autoInjectedId,
            needInputValues: columnNames.map((colName) => ({
                columnName: colName,
            })),
            createUndoFn,
        });
    }
    catch (error) {
        return returnError(tryCatchErrorToString(error));
    }
}
//# sourceMappingURL=insertBuilder.js.map