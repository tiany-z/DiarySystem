export const declare = {
    table(schemaOrTable, tableOrAs, as) {
        if (as !== undefined) {
            return {
                _type: "table",
                schema: schemaOrTable,
                table: tableOrAs,
                as: as,
            };
        }
        if (tableOrAs !== undefined) {
            // 兼容 declare.table("public", "users") 与 declare.table("users", "u")
            if (schemaOrTable.toLowerCase() === "public") {
                return {
                    _type: "table",
                    schema: "public",
                    table: tableOrAs,
                };
            }
            return {
                _type: "table",
                table: schemaOrTable,
                as: tableOrAs,
            };
        }
        return {
            _type: "table",
            table: schemaOrTable,
        };
    },
    column(tableNode, column, as, wrapper) {
        return {
            _type: "column",
            tableNode,
            column,
            as,
            functionWrapper: wrapper,
        };
    },
    customValue(str) {
        return {
            _type: "customValue",
            string: str,
        };
    },
    where: {
        compare(column, op, compareColumn) {
            return {
                _type: "whereCompareNode",
                column,
                operator: op,
                compareColumn,
            };
        },
        logicalLink(op) {
            return {
                _type: "whereLogicalLinkNode",
                operator: op,
            };
        },
        group(...children) {
            return {
                _type: "whereGroupNode",
                children,
            };
        },
    },
    orderBy: {
        ASC(column) {
            return {
                _type: "orderBy",
                column,
                direction: "ASC",
            };
        },
        DESC(column) {
            return {
                _type: "orderBy",
                column,
                direction: "DESC",
            };
        },
    },
    limit: {
        indexSize(startIndex, size) {
            return {
                _type: "limit",
                _limitType: "indexSize",
                startIndex,
                size,
            };
        },
        pageSize(page, size) {
            return {
                _type: "limit",
                _limitType: "pageSize",
                page,
                size,
            };
        },
    },
};
//# sourceMappingURL=declare.js.map