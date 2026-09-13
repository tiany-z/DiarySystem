export interface PendingMessage<T = any> {
    messageId: string;
    data: any;
    createdAt: number;
    resolve: (value: T) => void;
    reject: (reason: any) => void;
}
export declare class WsResilienceQueue {
    private isReconnecting;
    private pendingQueue;
    private graceTimer;
    private gracePeriodMs;
    constructor(gracePeriodSeconds?: number);
    getReconnectingState(): boolean;
    startGracePeriod(onTimeout: () => void): void;
    enqueuePendingMessage<T>(messageId: string, data: any): Promise<T>;
    flushQueue(sendFn: (data: any) => Promise<void>): Promise<void>;
    purgeAndRejectAll(errorMsg: string): void;
}
//# sourceMappingURL=wsResilienceQueue.d.ts.map