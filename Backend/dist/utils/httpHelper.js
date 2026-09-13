import { returnError, returnSuccess, tryCatchErrorToString } from "../core/index.js";
export async function parseJsonBody(req) {
    return new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
            if (data.length > 20 * 1024 * 1024) {
                // 20MB 限制 (支持图片 Base64 传输)
                req.destroy();
                resolve(returnError("Payload too large (Max 20MB)"));
            }
        });
        req.on("end", () => {
            if (!data || data.trim() === "") {
                return resolve(returnSuccess({}));
            }
            try {
                const parsed = JSON.parse(data);
                resolve(returnSuccess(parsed));
            }
            catch (err) {
                resolve(returnError(`Invalid JSON body: ${tryCatchErrorToString(err)}`));
            }
        });
        req.on("error", (err) => {
            resolve(returnError(`Read HTTP body failed: ${tryCatchErrorToString(err)}`));
        });
    });
}
export function sendJsonResponse(res, result, statusCode = 200) {
    const nodeId = process.env.NODE_ID || "diary-backend-01";
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Backend-Node, X-Requested-With",
        "Access-Control-Expose-Headers": "X-Backend-Node",
        "X-Backend-Node": nodeId,
    });
    res.end(JSON.stringify(result));
}
export function extractBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return null;
    if (authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7).trim();
    }
    return authHeader.trim();
}
//# sourceMappingURL=httpHelper.js.map