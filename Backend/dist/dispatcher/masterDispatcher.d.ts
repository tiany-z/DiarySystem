import http from "http";
export interface RequestContext {
    requestId: string;
    withdrawStack: Array<() => Promise<void>>;
    lockedRows: Array<{
        tableName: string;
        targetId: string | number;
        requestId: string;
    }>;
    userPayload?: any;
    clientIp: string;
}
export declare function dispatchHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
//# sourceMappingURL=masterDispatcher.d.ts.map