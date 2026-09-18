import { StandardResult } from "../../../core/index.js";
export declare const api: {
    routePath: string;
    authRequired: boolean;
    handler: (reqCtx: {
        req: any;
        body?: any;
        user?: any;
    }, ctx: any) => Promise<StandardResult<any>>;
};
export default api;
//# sourceMappingURL=index.d.ts.map