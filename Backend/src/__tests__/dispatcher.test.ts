import { describe, expect, it } from "vitest";
import { getApiRoute, scanAndPrecompileApiRoutes } from "../dispatcher/apiScanner.js";

describe("DiarySystem/Backend - API Router & Scanner Unit Tests", () => {
  it("应成功扫描并预编译所有 API 路由端点", async () => {
    const res = await scanAndPrecompileApiRoutes();
    expect(res.status).toBe(1);
    expect(typeof res.data).toBe("number");
    expect(res.data).toBeGreaterThan(0);
  });

  it("对不存在的路由应返回 null", () => {
    const route = getApiRoute("/api/nonexistent/path");
    expect(route).toBeNull();
  });

  it("应成功注册 /api/health 并可正常执行 handler", async () => {
    await scanAndPrecompileApiRoutes();
    const route = getApiRoute("/api/health");
    expect(route).not.toBeNull();
    expect(route?.routePath).toBe("/api/health");

    const res = await route!.handler({}, {} as any);
    expect(res.status).toBe(1);
    expect(res.data).toHaveProperty("status", "UP");
    expect(res.data).toHaveProperty("service");
  });

  it("应成功预编译 /api/diary/create 的 AST run 函数", async () => {
    await scanAndPrecompileApiRoutes();
    const route = getApiRoute("/api/diary/create");
    expect(route).not.toBeNull();
    expect(route?.run).toBeTypeOf("function");
  });

  it("dispatchHttpRequest 应兼容尾部斜杠路由 /api/health/ 并返回 200", async () => {
    const { dispatchHttpRequest } = await import("../dispatcher/masterDispatcher.js");
    let responseBody = "";
    let responseStatusCode = 0;

    const req: any = {
      url: "/api/health/",
      method: "GET",
      headers: { host: "localhost" },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event: string, cb: any) => {
        if (event === "end") cb();
        return req;
      },
    };

    const res: any = {
      writeHead: (code: number) => {
        responseStatusCode = code;
      },
      setHeader: () => {},
      end: (data: string) => {
        responseBody = data;
      },
    };

    await dispatchHttpRequest(req, res);
    expect(responseStatusCode).toBe(200);
    const parsed = JSON.parse(responseBody);
    expect(parsed.status).toBe(1);
    expect(parsed.data.status).toBe("UP");
  });

  it("dispatchHttpRequest 应支持 OPTIONS 跨域预检请求", async () => {
    const { dispatchHttpRequest } = await import("../dispatcher/masterDispatcher.js");
    let responseStatusCode = 0;

    const req: any = {
      url: "/api/health",
      method: "OPTIONS",
      headers: { host: "localhost" },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event: string, cb: any) => {
        if (event === "end") cb();
        return req;
      },
    };

    const res: any = {
      writeHead: (code: number) => {
        responseStatusCode = code;
      },
      setHeader: () => {},
      end: () => {},
    };

    await dispatchHttpRequest(req, res);
    expect(responseStatusCode).toBe(200);
  });

  it("应成功调用 /api/diary/create 并通过内核返回生成的主键 id", async () => {
    await scanAndPrecompileApiRoutes();
    const route = getApiRoute("/api/diary/create");
    expect(route).not.toBeNull();

    // 模拟底层 run 函数行为 (验证传参不带 id，且返回自动生成的 id)
    const passedParams: any[] = [];
    route!.run = async (params: any[]) => {
      passedParams.push(...params);
      return { status: 1, data: { id: "mock-auto-uuid-888" }, content: "success" };
    };

    const reqCtx = {
      body: {
        title: "我的日记",
        content: "今天天气很好",
        weather: "Sunny",
        mood: "Happy",
      },
    };
    const ctx = {
      userPayload: { userId: "user-123" },
      requestId: "req-1",
    };

    const res = await route!.handler(reqCtx, ctx);
    expect(res.status).toBe(1);
    expect(res.data.id).toBe("mock-auto-uuid-888");
    expect(res.data.title).toBe("我的日记");
    // 验证调用 run 时参数没有前置 id，完全按照业务字段传参
    expect(passedParams[0]).toBe("user-123");
    expect(passedParams[1]).toBe("我的日记");
  });
});
