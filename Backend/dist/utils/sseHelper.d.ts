import http from "http";
/**
 * 原生 Node.js http 适配的 SSE (Server-Sent Events) 流式控制器
 * 职责：
 * 1. 自动写入合规 SSE 响应头与 CORS 头
 * 2. 15 秒心跳保活 (: ping\n\n)，防止网关/代理长连接超时
 * 3. 监听客户端 Socket 断开并触发 AbortController 熔断
 * 4. 结构化标准化下发自定义事件 (sendEvent, finish, error)
 */
export declare class SseStreamController {
    private res;
    private req;
    private pingTimer;
    private isClosed;
    private abortController;
    constructor(req: http.IncomingMessage, res: http.ServerResponse);
    get signal(): AbortSignal;
    get closed(): boolean;
    /**
     * 推送标准 SSE 事件
     * 格式: event: {eventName}\ndata: {data}\n\n
     */
    sendEvent(eventName: string, data: any): void;
    /**
     * 发送最终事件并正常结束 SSE 流
     */
    finish(data?: any): void;
    /**
     * 下发错误并关闭流
     */
    error(errorMsg: string): void;
    private cleanUp;
}
//# sourceMappingURL=sseHelper.d.ts.map