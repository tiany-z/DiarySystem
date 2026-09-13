import { StandardResult } from "#core";
export declare const api: {
    routePath: string;
    authRequired: boolean;
    astConfig: {
        type: string;
        compose: {
            table: import("#core").TableNode;
            columns: import("#core").ColumnNode[];
        };
    };
    run: any;
    handler: (reqCtx: {
        body: any;
    }, ctx: any) => Promise<StandardResult<any>>;
};
export default api;
//# sourceMappingURL=index.d.ts.map