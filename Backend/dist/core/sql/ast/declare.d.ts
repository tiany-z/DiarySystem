import type { ColumnNode, CustomValueNode, functionWrapper, LimitNode, NonEmptyString, operator, OrderByNode, TableNode, WhereCompareNode, WhereConditionNode, WhereGroupNode, WhereLogicalLinkNode, whereLogicalOperator } from "../type.js";
export declare const declare: {
    table(schemaOrTable: string, tableOrAs?: string, as?: string): TableNode;
    column(tableNode: TableNode, column: NonEmptyString, as?: NonEmptyString, wrapper?: functionWrapper): ColumnNode;
    customValue(str: string): CustomValueNode;
    where: {
        compare(column: ColumnNode | CustomValueNode, op: operator, compareColumn?: ColumnNode | CustomValueNode): WhereCompareNode;
        logicalLink(op: whereLogicalOperator): WhereLogicalLinkNode;
        group(...children: Array<WhereConditionNode>): WhereGroupNode;
    };
    orderBy: {
        ASC(column: ColumnNode): OrderByNode;
        DESC(column: ColumnNode): OrderByNode;
    };
    limit: {
        indexSize(startIndex: number, size: number): LimitNode;
        pageSize(page: number, size: number): LimitNode;
    };
};
//# sourceMappingURL=declare.d.ts.map