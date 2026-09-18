import { StandardResult } from "../../../core/index.js";
export declare const api: {
    routePath: string;
    authRequired: boolean;
    handler: (reqCtx: {
        req: any;
        query?: any;
        body?: any;
        user?: any;
    }, ctx: any) => Promise<StandardResult<any>>;
};
//# sourceMappingURL=index.d.ts.map