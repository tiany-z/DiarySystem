import { StandardResult } from "../../flow/result.js";
import type { ColumnNode, LimitNode, NeedInputValue, NonEmptyString, OrderByNode, ParseColumnsResult, ParseLimitResult, ParseOrderByResult, ParseWhereResult, TableNode, WhereConditionNode } from "../type.js";
/**
 * 获取表名 (适配 MySQL：自动剥离 public Schema，返回标准表名或库.表格式)
 */
export declare function getTableName(tableNode: TableNode, forceOriginName?: boolean): NonEmptyString;
/**
 * 获取列名 (如 users.id 或 alias)
 */
export declare function getColumnName(columnNode: ColumnNode, forceOriginName?: boolean): NonEmptyString;
export declare function containsDangerousKeyword(sqlFragment: string): StandardResult<{
    hasKeyword: boolean;
    keyword?: string;
}>;
export declare function validateSQLFragment(fragment: string): StandardResult<{
    isValid: boolean;
}>;
export declare function parseColumns(...columns: Array<ColumnNode>): StandardResult<ParseColumnsResult>;
export declare function parseWhereGroup(whereGroup: Array<WhereConditionNode>, isHaving?: boolean, recordNeedInputValues?: Array<NeedInputValue>): StandardResult<string>;
export declare function parseWhere(...whereConditions: Array<WhereConditionNode>): StandardResult<ParseWhereResult>;
export declare function parseOrderBy(...orderByNodes: Array<OrderByNode>): StandardResult<ParseOrderByResult>;
export declare function parseLimit(limitNode: LimitNode): StandardResult<ParseLimitResult>;
//# sourceMappingURL=validator.d.ts.map