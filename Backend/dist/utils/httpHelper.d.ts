import http from "http";
import { StandardResult } from "../core/index.js";
export declare function parseJsonBody<T = any>(req: http.IncomingMessage): Promise<StandardResult<T>>;
export declare function sendJsonResponse<T = any>(res: http.ServerResponse, result: StandardResult<T>, statusCode?: number): void;
export declare function extractBearerToken(req: http.IncomingMessage): string | null;
//# sourceMappingURL=httpHelper.d.ts.map