import { StandardResult } from "../../../core/index.js";
import { UploadedFile } from "../../../utils/multipartHelper.js";
export declare const api: {
    routePath: string;
    authRequired: boolean;
    handler: (reqCtx: {
        body: any;
        files?: UploadedFile[];
        user?: any;
    }, ctx: any) => Promise<StandardResult<any>>;
};
export default api;
//# sourceMappingURL=index.d.ts.map