import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "events";
import { SseStreamController } from "../utils/sseHelper.js";
import { scanAndPrecompileApiRoutes, getApiRoute } from "../dispatcher/apiScanner.js";
describe("Module 4: SseStreamController Unit Tests", () => {
    function createMockReqRes() {
        const req = new EventEmitter();
        req.socket = {
            setKeepAlive: vi.fn(),
        };
        const writtenChunks = [];
        const headers = {};
        let ended = false;
        let statusCode = 200;
        const res = {
            writeHead: vi.fn((code, h) => {
                statusCode = code;
                Object.assign(headers, h);
            }),
            write: vi.fn((chunk) => {
                writtenChunks.push(chunk.toString());
                return true;
            }),
            end: vi.fn(() => {
                ended = true;
            }),
            get writableEnded() {
                return ended;
            },
        };
        return { req, res, writtenChunks, headers };
    }
    it("should initialize SSE headers and enable keep-alive", () => {
        const { req, res, headers } = createMockReqRes();
        const sse = new SseStreamController(req, res);
        expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
        expect(headers["Content-Type"]).toContain("text/event-stream");
        expect(headers["Cache-Control"]).toContain("no-cache");
        expect(headers["Connection"]).toBe("keep-alive");
        expect(req.socket.setKeepAlive).toHaveBeenCalledWith(true);
        expect(sse.closed).toBe(false);
    });
    it("should format custom events correctly according to SSE specification", () => {
        const { req, res, writtenChunks } = createMockReqRes();
        const sse = new SseStreamController(req, res);
        sse.sendEvent("conversation", { conversationId: "c-101", title: "测试会话" });
        sse.sendEvent("thought", { delta: "正在思考..." });
        sse.sendEvent("chunk", { delta: "你好世界！" });
        expect(writtenChunks).toHaveLength(3);
        expect(writtenChunks[0]).toBe('event: conversation\ndata: {"conversationId":"c-101","title":"测试会话"}\n\n');
        expect(writtenChunks[1]).toBe('event: thought\ndata: {"delta":"正在思考..."}\n\n');
        expect(writtenChunks[2]).toBe('event: chunk\ndata: {"delta":"你好世界！"}\n\n');
    });
    it("should trigger abort signal and clean up when client disconnects", () => {
        const { req, res } = createMockReqRes();
        const sse = new SseStreamController(req, res);
        expect(sse.signal.aborted).toBe(false);
        // 模拟客户端断开连接
        req.emit("close");
        expect(sse.signal.aborted).toBe(true);
        expect(sse.closed).toBe(true);
    });
    it("should send finish event and close response stream", () => {
        const { req, res, writtenChunks } = createMockReqRes();
        const sse = new SseStreamController(req, res);
        sse.finish({ messageId: "m-202" });
        expect(writtenChunks[writtenChunks.length - 1]).toContain("event: finish");
        expect(writtenChunks[writtenChunks.length - 1]).toContain('"messageId":"m-202"');
        expect(res.end).toHaveBeenCalled();
    });
});
describe("Module 4: AI API Endpoints Registration Tests", () => {
    it("should discover and register all Module 4 AI endpoints", async () => {
        const scanRes = await scanAndPrecompileApiRoutes();
        expect(scanRes.status).toBe(1);
        const convRoute = getApiRoute("/api/ai/conversations");
        expect(convRoute).toBeDefined();
        expect(convRoute?.authRequired).toBe(true);
        const msgRoute = getApiRoute("/api/ai/messages");
        expect(msgRoute).toBeDefined();
        expect(msgRoute?.authRequired).toBe(true);
        const chatRoute = getApiRoute("/api/ai/chat");
        expect(chatRoute).toBeDefined();
        expect(chatRoute?.authRequired).toBe(true);
    });
    it("should reject unauthenticated requests to AI endpoints", async () => {
        const convRoute = getApiRoute("/api/ai/conversations");
        const res = await convRoute.handler({ req: { method: "GET" } }, {});
        expect(res.status).toBe(0);
        expect(res.content).toContain("未鉴权");
        const chatRoute = getApiRoute("/api/ai/chat");
        const chatRes = await chatRoute.handler({ req: { method: "POST" }, body: { message: "hi" } }, {});
        expect(chatRes.status).toBe(0);
        expect(chatRes.content).toContain("未鉴权");
    });
    it("should reject empty message in /api/ai/chat", async () => {
        const chatRoute = getApiRoute("/api/ai/chat");
        const res = await chatRoute.handler({
            req: { method: "POST" },
            user: { userId: "user-1" },
            body: { message: "   " },
        }, {});
        expect(res.status).toBe(0);
        expect(res.content).toContain("不能为空");
    });
});
//# sourceMappingURL=agentSseGateway.test.js.map