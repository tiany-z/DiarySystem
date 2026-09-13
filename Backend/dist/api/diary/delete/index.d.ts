import { StandardResult } from "#core";
export declare const api: {
    routePath: string;
    authRequired: boolean;
    astConfig: {
        type: string;
    };
    run: any;
    handler: (reqCtx: {
        body: any;
    }, ctx: any) => Promise<StandardResult<any>>;
};
export default api;
//# sourceMappingURL=index.d.ts.map