import type {
  ColumnNode,
  CustomValueNode,
  functionWrapper,
  LimitNode,
  LimitSubType,
  NonEmptyString,
  operator,
  OrderByNode,
  TableNode,
  WhereCompareNode,
  WhereConditionNode,
  WhereGroupNode,
  WhereLogicalLinkNode,
  whereLogicalOperator,
} from "../type.js";

export const declare = {
  table(
    schemaOrTable: string,
    tableOrAs?: string,
    as?: string
  ): TableNode {
    if (as !== undefined) {
      return {
        _type: "table",
        schema: schemaOrTable,
        table: tableOrAs as NonEmptyString,
        as: as as NonEmptyString,
      };
    }
    if (tableOrAs !== undefined) {
      // 兼容 declare.table("public", "users") 与 declare.table("users", "u")
      if (schemaOrTable.toLowerCase() === "public") {
        return {
          _type: "table",
          schema: "public",
          table: tableOrAs as NonEmptyString,
        };
      }
      return {
        _type: "table",
        table: schemaOrTable as NonEmptyString,
        as: tableOrAs as NonEmptyString,
      };
    }
    return {
      _type: "table",
      table: schemaOrTable as NonEmptyString,
    };
  },

  column(
    tableNode: TableNode,
    column: NonEmptyString,
    as?: NonEmptyString,
    wrapper?: functionWrapper
  ): ColumnNode {
    return {
      _type: "column",
      tableNode,
      column,
      as,
      functionWrapper: wrapper,
    };
  },

  customValue(str: string): CustomValueNode {
    return {
      _type: "customValue",
      string: str,
    };
  },

  where: {
    compare(
      column: ColumnNode | CustomValueNode,
      op: operator,
      compareColumn?: ColumnNode | CustomValueNode
    ): WhereCompareNode {
      return {
        _type: "whereCompareNode",
        column,
        operator: op,
        compareColumn,
      };
    },

    logicalLink(op: whereLogicalOperator): WhereLogicalLinkNode {
      return {
        _type: "whereLogicalLinkNode",
        operator: op,
      };
    },

    group(...children: Array<WhereConditionNode>): WhereGroupNode {
      return {
        _type: "whereGroupNode",
        children,
      };
    },
  },

  orderBy: {
    ASC(column: ColumnNode): OrderByNode {
      return {
        _type: "orderBy",
        column,
        direction: "ASC",
      };
    },
    DESC(column: ColumnNode): OrderByNode {
      return {
        _type: "orderBy",
        column,
        direction: "DESC",
      };
    },
  },

  limit: {
    indexSize(startIndex: number, size: number): LimitNode {
      return {
        _type: "limit",
        _limitType: "indexSize",
        startIndex,
        size,
      };
    },
    pageSize(page: number, size: number): LimitNode {
      return {
        _type: "limit",
        _limitType: "pageSize",
        page,
        size,
      };
    },
  },
};
