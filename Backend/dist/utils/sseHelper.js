/**
 * 原生 Node.js http 适配的 SSE (Server-Sent Events) 流式控制器
 * 职责：
 * 1. 自动写入合规 SSE 响应头与 CORS 头
 * 2. 15 秒心跳保活 (: ping\n\n)，防止网关/代理长连接超时
 * 3. 监听客户端 Socket 断开并触发 AbortController 熔断
 * 4. 结构化标准化下发自定义事件 (sendEvent, finish, error)
 */
export class SseStreamController {
    res;
    req;
    pingTimer = null;
    isClosed = false;
    abortController = new AbortController();
    constructor(req, res) {
        this.req = req;
        this.res = res;
        // 1. 设置标准 SSE 响应头与 CORS 头
        this.res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no", // 禁用 Nginx 等反向代理的缓存分包
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        });
        // 2. 启用底层的 TCP Keep-Alive
        if (this.req.socket) {
            this.req.socket.setKeepAlive(true);
        }
        // 3. 监听客户端主动关闭连接 (如用户点击停止、关闭浏览器标签页)
        this.req.on("close", () => {
            this.isClosed = true;
            this.abortController.abort();
            this.cleanUp();
        });
        // 4. 定期发送心跳保活注释行 (: ping\n\n)，避免客户端或反代网关超时断开
        this.pingTimer = setInterval(() => {
            if (!this.isClosed && !this.res.writableEnded) {
                try {
                    this.res.write(": ping\n\n");
                }
                catch {
                    this.cleanUp();
                }
            }
        }, 15000);
    }
    get signal() {
        return this.abortController.signal;
    }
    get closed() {
        return this.isClosed || this.res.writableEnded;
    }
    /**
     * 推送标准 SSE 事件
     * 格式: event: {eventName}\ndata: {data}\n\n
     */
    sendEvent(eventName, data) {
        if (this.closed)
            return;
        try {
            const payload = typeof data === "string" ? data : JSON.stringify(data);
            this.res.write(`event: ${eventName}\ndata: ${payload}\n\n`);
        }
        catch {
            this.cleanUp();
        }
    }
    /**
     * 发送最终事件并正常结束 SSE 流
     */
    finish(data) {
        if (this.closed)
            return;
        try {
            if (data) {
                this.sendEvent("finish", data);
            }
        }
        finally {
            this.cleanUp();
            try {
                this.res.end();
            }
            catch { }
        }
    }
    /**
     * 下发错误并关闭流
     */
    error(errorMsg) {
        if (this.closed)
            return;
        try {
            this.sendEvent("error", { error: errorMsg });
        }
        finally {
            this.cleanUp();
            try {
                this.res.end();
            }
            catch { }
        }
    }
    cleanUp() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
}
//# sourceMappingURL=sseHelper.js.map