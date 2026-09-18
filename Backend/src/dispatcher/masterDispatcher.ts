import http from "http";
import fs from "fs";
import path from "path";
import {
  genUUID,
  LogClient,
  returnError,
  RowLockManager,
  StandardResult,
  tryCatchErrorToString,
  verifyJwtToken,
} from "../core/index.js";
import { extractBearerToken, parseJsonBody, sendJsonResponse } from "../utils/httpHelper.js";
import { extractClientIp } from "../utils/ipHelper.js";
import { parseMultipartBody, UploadedFile } from "../utils/multipartHelper.js";
import { getApiRoute } from "./apiScanner.js";

export interface RequestContext {
  requestId: string;
  withdrawStack: Array<() => Promise<void>>;
  lockedRows: Array<{ tableName: string; targetId: string | number; requestId: string }>;
  userPayload?: any;
  clientIp: string;
}

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
};

async function serveStaticUploadFile(pathname: string, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const prefix = pathname.startsWith("/api/uploads/") ? "/api/uploads/" : "/uploads/";
  const relPath = pathname.slice(prefix.length);

  // 防路径穿越安全校验
  const safeFilename = path.basename(relPath);
  const filePath = path.join(uploadsDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    sendJsonResponse(res, returnError(`File not found: ${safeFilename}`), 404);
    return;
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    sendJsonResponse(res, returnError("Not a valid file"), 404);
    return;
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

function recordAccessLog(
  method: string,
  path: string,
  statusCode: number,
  ip: string,
  durationMs: number,
  userId?: string | null
) {
  LogClient.info(
    `${method} ${path} | Status: ${statusCode} | ${durationMs}ms | IP: ${ip} | User: ${userId || "anonymous"}`,
    undefined,
    "AccessLog"
  );
}

export async function dispatchHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const startTime = Date.now();
  const requestId = genUUID();
  const lockedRows: Array<{ tableName: string; targetId: string | number; requestId: string }> = [];
  const withdrawStack: Array<() => Promise<void>> = [];

  const clientIp = extractClientIp(req);
  let pathname = "/";
  let currentUserId: string | null = null;

  try {
    const urlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    // OPTIONS 跨域预检
    if (req.method === "OPTIONS") {
      sendJsonResponse(res, { status: 1, content: "OK" }, 200);
      recordAccessLog(req.method || "OPTIONS", pathname, 200, clientIp, Date.now() - startTime, null);
      return;
    }

    // 静态上传文件流式分发 (/uploads/* 与 /api/uploads/*)
    if (pathname.startsWith("/uploads/") || pathname.startsWith("/api/uploads/")) {
      await serveStaticUploadFile(pathname, req, res);
      recordAccessLog(req.method || "GET", pathname, res.statusCode || 200, clientIp, Date.now() - startTime, null);
      return;
    }

    const route = getApiRoute(pathname);
    if (!route) {
      sendJsonResponse(res, returnError(`API 404 Not Found: ${pathname}`), 404);
      recordAccessLog(req.method || "GET", pathname, 404, clientIp, Date.now() - startTime, null);
      return;
    }

    let userPayload: any = null;
    const token = extractBearerToken(req);
    if (token) {
      const jwtRes = verifyJwtToken(token);
      if (jwtRes.status === 1) {
        userPayload = jwtRes.data;
        currentUserId = userPayload?.userId || null;
      } else if (route.authRequired !== false) {
        sendJsonResponse(res, returnError(`无效或过期的认证 Token: ${jwtRes.content}`), 401);
        recordAccessLog(req.method || "GET", pathname, 401, clientIp, Date.now() - startTime, null);
        return;
      }
    } else if (route.authRequired !== false) {
      sendJsonResponse(res, returnError("未提供认证 Token (Bearer token missing)"), 401);
      recordAccessLog(req.method || "GET", pathname, 401, clientIp, Date.now() - startTime, null);
      return;
    }

    let body: any = {};
    let files: UploadedFile[] = [];
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      const multiRes = await parseMultipartBody(req);
      if (multiRes.status === 1 && multiRes.data) {
        body = multiRes.data.fields;
        files = multiRes.data.files;
      } else {
        sendJsonResponse(res, returnError(multiRes.content || "解析上传数据失败"), 400);
        recordAccessLog(req.method || "POST", pathname, 400, clientIp, Date.now() - startTime, currentUserId);
        return;
      }
    } else {
      const bodyRes = await parseJsonBody(req);
      body = bodyRes.status === 1 ? bodyRes.data : {};
    }

    const ctx: RequestContext = {
      requestId,
      withdrawStack,
      lockedRows,
      userPayload,
      clientIp,
    };

    const query = Object.fromEntries(urlObj.searchParams);
    (req as any).body = body;
    (req as any).query = query;
    (req as any).clientIp = clientIp;
    (req as any).user = userPayload;

    const reqCtx = {
      req,
      res,
      query,
      body,
      files,
      clientIp,
      params: query,
      user: userPayload,
    };

    // 执行接口 Handler (依赖连接池自动提交，无数据库显式死锁事务)
    const handlerRes = await route.handler(reqCtx, ctx);

    // 若响应头已被 Handler 接管下发 (如 SSE 流式传输)，网关不重复发送 JSON 响应
    if (res.headersSent) {
      await releaseMemoryLocks(lockedRows, true);
      recordAccessLog(req.method || "GET", pathname, 200, clientIp, Date.now() - startTime, currentUserId);
      return;
    }

    if (handlerRes.status === 1) {
      // 成功：释放 Redis 分布式行锁
      await releaseMemoryLocks(lockedRows, true);
      sendJsonResponse(res, handlerRes, 200);
      recordAccessLog(req.method || "GET", pathname, 200, clientIp, Date.now() - startTime, currentUserId);
    } else {
      // 业务失败：逆序 (LIFO) 执行 withdrawStack 补偿撤销闭包自愈数据，并释放分布式锁
      await handleDispatchFailure(withdrawStack, lockedRows, handlerRes.content);
      sendJsonResponse(res, handlerRes, 400);
      recordAccessLog(req.method || "GET", pathname, 400, clientIp, Date.now() - startTime, currentUserId);
    }
  } catch (error) {
    const errMsg = tryCatchErrorToString(error);
    await handleDispatchFailure(withdrawStack, lockedRows, errMsg);
    if (res.headersSent) {
      recordAccessLog(req.method || "GET", pathname, 500, clientIp, Date.now() - startTime, currentUserId);
      return;
    }
    sendJsonResponse(res, returnError(`Server Internal Dispatch Error: ${errMsg}`), 500);
    recordAccessLog(req.method || "GET", pathname, 500, clientIp, Date.now() - startTime, currentUserId);
  }
}

async function handleDispatchFailure(
  withdrawStack: Array<() => Promise<void>>,
  lockedRows: Array<{ tableName: string; targetId: string | number; requestId: string }>,
  errorMsg: string
) {
  // 逆序 (LIFO) 执行所有 Undo 闭包，还原 MySQL 数据库与 Redis 缓存
  for (let i = withdrawStack.length - 1; i >= 0; i--) {
    try {
      await withdrawStack[i]();
    } catch {}
  }

  // 释放 Redis 分布式行锁
  await releaseMemoryLocks(lockedRows, false);
}

async function releaseMemoryLocks(
  lockedRows: Array<{ tableName: string; targetId: string | number; requestId: string }>,
  isCommitted: boolean
) {
  for (const item of lockedRows) {
    try {
      await RowLockManager.releaseRowLock(item.tableName, item.targetId, item.requestId, isCommitted);
    } catch {}
  }
}
