import { StandardResult } from "#core";
export declare const api: {
    routePath: string;
    authRequired: boolean;
    astConfig: {
        type: string;
        compose: {
            columns: import("#core").ColumnNode[];
            where: import("#core").WhereCompareNode[];
            orderBy: import("#core").OrderByNode[];
            limit: import("#core").LimitNode;
        };
    };
    run: any;
    handler: (reqCtx: {
        query: any;
    }, ctx: any) => Promise<StandardResult<any>>;
};
export default api;
//# sourceMappingURL=index.d.ts.map