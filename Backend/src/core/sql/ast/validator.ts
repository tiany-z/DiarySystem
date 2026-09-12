import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../../flow/result.js";
import type {
  ColumnNode,
  LimitNode,
  NeedInputValue,
  NonEmptyString,
  OrderByNode,
  ParseColumnsResult,
  ParseLimitResult,
  ParseOrderByResult,
  ParseWhereResult,
  TableNode,
  WhereConditionNode,
} from "../type.js";

/**
 * 获取表名 (适配 MySQL：自动剥离 public Schema，返回标准表名或库.表格式)
 */
export function getTableName(
  tableNode: TableNode,
  forceOriginName: boolean = false
): NonEmptyString {
  if (tableNode.as !== undefined && !forceOriginName) {
    return tableNode.as as NonEmptyString;
  }

  const schema = tableNode.schema?.trim();
  const table = tableNode.table.trim();

  // 若为 public 或空，MySQL 直接使用表名
  if (!schema || schema.toLowerCase() === "public") {
    return table as NonEmptyString;
  }

  return `${schema}.${table}` as NonEmptyString;
}

/**
 * 获取列名 (如 users.id 或 alias)
 */
export function getColumnName(
  columnNode: ColumnNode,
  forceOriginName: boolean = false
): NonEmptyString {
  const tableRef = columnNode.tableNode.as || getTableName(columnNode.tableNode, true);
  const originName = `${tableRef}.${columnNode.column}`;
  const asName = columnNode.as;
  if (asName === undefined || forceOriginName) {
    return originName as NonEmptyString;
  }
  return asName as NonEmptyString;
}

export function containsDangerousKeyword(sqlFragment: string): StandardResult<{
  hasKeyword: boolean;
  keyword?: string;
}> {
  try {
    const dangerousKeywords = [
      "DROP",
      "DELETE",
      "INSERT",
      "UPDATE",
      "TRUNCATE",
      "ALTER",
      "CREATE",
      "EXEC",
      "EXECUTE",
      "GRANT",
      "REVOKE",
      "UNION",
      "INFORMATION_SCHEMA",
      "BENCHMARK",
    ];

    const upperFragment = sqlFragment.toUpperCase();
    for (const keyword of dangerousKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(upperFragment)) {
        return returnSuccess({
          hasKeyword: true,
          keyword,
        });
      }
    }

    return returnSuccess({ hasKeyword: false });
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}

export function validateSQLFragment(fragment: string): StandardResult<{ isValid: boolean }> {
  try {
    if (!fragment || fragment.trim() === "") {
      return returnError("SQL片段不能为空");
    }

    const trimmed = fragment.trim();

    if (trimmed.includes("--") || trimmed.includes("/*") || trimmed.includes("*/")) {
      return returnError("检测到SQL注释标记，已拦截");
    }

    if (trimmed.includes(";")) {
      return returnError("检测到多语句注入标记(;)，已拦截");
    }

    const upperStr = trimmed.toUpperCase();
    if (
      upperStr.includes("OR 1=1") ||
      upperStr.includes("AND 1=1") ||
      upperStr.includes("OR 1 = 1") ||
      upperStr.includes("AND 1 = 1")
    ) {
      return returnError("检测到恒真注入模式(OR 1=1)，已拦截");
    }

    if (upperStr.includes("SLEEP(") || upperStr.includes("BENCHMARK(")) {
      return returnError("检测到盲注延时函数(SLEEP/BENCHMARK)，已拦截");
    }

    const dangerousKeywordResult = containsDangerousKeyword(trimmed);
    if (dangerousKeywordResult.status === 0) {
      return returnError(dangerousKeywordResult.content);
    }
    const keywordData = dangerousKeywordResult.data;
    if (keywordData?.hasKeyword) {
      return returnError(`检测到危险SQL关键字，已拦截: ${keywordData.keyword}`);
    }

    if (trimmed.length > 1000) {
      return returnError("SQL片段超出最大长度限制（1000个字符）");
    }

    return returnSuccess({ isValid: true });
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}

export function parseColumns(...columns: Array<ColumnNode>): StandardResult<ParseColumnsResult> {
  try {
    const tableNames: Array<NonEmptyString> = [];
    const sqlParts = columns.map((item) => {
      const tableNode = item.tableNode;
      const alias = item.as;
      const wrapper = item.functionWrapper;

      let columnPart = getColumnName(item, true);
      tableNames.push(
        `${getTableName(tableNode, true)}${tableNode.as === undefined ? "" : ` ${tableNode.as}`}` as NonEmptyString
      );

      if (wrapper !== undefined) {
        columnPart = wrapper.replace("?", columnPart) as NonEmptyString;
      }

      if (alias !== undefined) {
        columnPart += ` AS ${alias}`;
      }

      return columnPart;
    });

    const uniqueTables = [...new Set(tableNames)];
    if (uniqueTables.length > 1) {
      return returnError("为保证高并发系统的性能，因此只能进行单表查询");
    }

    return returnSuccess<ParseColumnsResult>({
      columnsSQL: sqlParts.join(", "),
      tablesSQL: uniqueTables.join(", "),
    });
  } catch (error) {
    return returnError<ParseColumnsResult>(tryCatchErrorToString(error));
  }
}

export function parseWhereGroup(
  whereGroup: Array<WhereConditionNode>,
  isHaving: boolean = false,
  recordNeedInputValues: Array<NeedInputValue> = []
): StandardResult<string> {
  try {
    for (let i = 0; i < whereGroup.length; i++) {
      const currentItem = whereGroup[i];
      if (i % 2 === 0 && currentItem._type !== "whereCompareNode" && currentItem._type !== "whereGroupNode") {
        return returnError("whereGroup 中的比较运算符(组)位置错误");
      }
      if (i % 2 === 1 && currentItem._type !== "whereLogicalLinkNode") {
        return returnError("whereGroup 中的逻辑运算符位置错误");
      }
    }

    const sqlParts: Array<string> = [];

    for (let i = 0; i < whereGroup.length; i++) {
      const currentItem = whereGroup[i];
      const isEvenIndex = i % 2 === 0;

      if (isEvenIndex) {
        if (currentItem?._type === "whereGroupNode") {
          const groupResult = parseWhereGroup(currentItem.children, isHaving, recordNeedInputValues);
          if (groupResult.status === 0) return groupResult;
          sqlParts.push(`(${groupResult.data})`);
        } else if (currentItem?._type === "whereCompareNode") {
          if (currentItem.column?._type === "customValue" && !validateSQLFragment(currentItem.column.string).status) {
            return returnError("whereGroup 中的比较运算符(组)中的自定义值包含危险字符");
          }
          if (currentItem.compareColumn?._type === "customValue" && !validateSQLFragment(currentItem.compareColumn.string).status) {
            return returnError("whereGroup 中的比较运算符(组)中的自定义值包含危险字符");
          }
          const comparePartLeft = (() => {
            if (currentItem.column === undefined) return "";
            if (currentItem.column._type === "customValue") return currentItem.column.string;
            const originName = getColumnName(currentItem.column, true);
            if (isHaving && currentItem.column.functionWrapper !== undefined) {
              return currentItem.column.functionWrapper.replace("?", originName) as NonEmptyString;
            }
            return originName;
          })();
          const comparePartRight = (() => {
            if (currentItem.compareColumn === undefined) return "-!!value!!-";
            if (currentItem.compareColumn._type === "customValue") return currentItem.compareColumn.string;
            const originName = getColumnName(currentItem.compareColumn, true);
            if (isHaving && currentItem.compareColumn.functionWrapper !== undefined) {
              return currentItem.compareColumn.functionWrapper.replace("?", originName) as NonEmptyString;
            }
            return originName;
          })();
          let op = currentItem.operator as string;
          if (op === "ILIKE") op = "LIKE";
          else if (op === "NOT ILIKE") op = "NOT LIKE";
          else if (op === "SIMILAR TO") op = "REGEXP";
          else if (op === "NOT SIMILAR TO") op = "NOT REGEXP";

          if (op === "IS NULL" || op === "IS NOT NULL") {
            const comparePart = `${comparePartLeft} ${op}`;
            sqlParts.push(comparePart);
          } else {
            const comparePart = `${comparePartLeft} ${op} ${comparePartRight}`;
            sqlParts.push(comparePart);
            if (currentItem.compareColumn === undefined) {
              recordNeedInputValues.push({
                currentSQL: comparePart as NonEmptyString,
              });
            }
          }
        }
      } else {
        if (currentItem?._type === "whereLogicalLinkNode") {
          sqlParts.push(` ${currentItem.operator} `);
        }
      }
    }

    return returnSuccess(sqlParts.join(""));
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}

export function parseWhere(...whereConditions: Array<WhereConditionNode>): StandardResult<ParseWhereResult> {
  try {
    const needInputValues: Array<NeedInputValue> = [];
    const parseResult = parseWhereGroup(whereConditions, false, needInputValues);
    if (parseResult.status === 0) return returnError(parseResult.content);

    return returnSuccess<ParseWhereResult>({
      whereSQL: parseResult.data as string,
      needInputValues,
    });
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}

export function parseOrderBy(...orderByNodes: Array<OrderByNode>): StandardResult<ParseOrderByResult> {
  try {
    const sqlParts: Array<string> = [];
    for (const item of orderByNodes) {
      sqlParts.push(`${getColumnName(item.column, true)} ${item.direction}`);
    }
    return returnSuccess({
      orderBySQL: sqlParts.join(", "),
    });
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}

export function parseLimit(limitNode: LimitNode): StandardResult<ParseLimitResult> {
  try {
    if (limitNode._limitType === "indexSize") {
      return returnSuccess({
        limitSQL: `${limitNode.size}${limitNode.startIndex ? ` OFFSET ${limitNode.startIndex}` : ""}`,
      });
    }
    if (limitNode._limitType === "pageSize") {
      return returnSuccess({
        limitSQL: `${limitNode.size}${limitNode.page ? ` OFFSET ${(limitNode.page - 1) * limitNode.size}` : ""}`,
      });
    }
    return returnError("limitNode limit类型错误");
  } catch (error) {
    return returnError(tryCatchErrorToString(error));
  }
}
