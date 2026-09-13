import { StandardResult } from "../core/index.js";
export interface ApiEndpointModule {
    routePath: string;
    authRequired?: boolean;
    astConfig?: any;
    run: ((params: any, ctx?: any) => Promise<StandardResult<any>>) | null;
    handler: (reqCtx: any, ctx: any) => Promise<StandardResult<any>>;
}
export declare function scanAndPrecompileApiRoutes(apiDir?: string): Promise<StandardResult<number>>;
export declare function getApiRoute(routePath: string): ApiEndpointModule | null;
export declare function getAllRoutes(): Map<string, ApiEndpointModule>;
//# sourceMappingURL=apiScanner.d.ts.map