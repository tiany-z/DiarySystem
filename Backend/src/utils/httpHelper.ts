import http from "http";
import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../core/index.js";

export async function parseJsonBody<T = any>(req: http.IncomingMessage): Promise<StandardResult<T>> {
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
        return resolve(returnSuccess({} as T));
      }
      try {
        const parsed = JSON.parse(data) as T;
        resolve(returnSuccess(parsed));
      } catch (err) {
        resolve(returnError(`Invalid JSON body: ${tryCatchErrorToString(err)}`));
      }
    });

    req.on("error", (err) => {
      resolve(returnError(`Read HTTP body failed: ${tryCatchErrorToString(err)}`));
    });
  });
}

export function sendJsonResponse<T = any>(
  res: http.ServerResponse,
  result: StandardResult<T>,
  statusCode: number = 200
) {
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

export function extractBearerToken(req: http.IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return authHeader.trim();
}
