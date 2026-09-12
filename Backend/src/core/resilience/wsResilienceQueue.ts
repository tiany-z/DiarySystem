export interface PendingMessage<T = any> {
  messageId: string;
  data: any;
  createdAt: number;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

export class WsResilienceQueue {
  private isReconnecting: boolean = false;
  private pendingQueue: Array<PendingMessage> = [];
  private graceTimer: NodeJS.Timeout | null = null;
  private gracePeriodMs: number;

  constructor(gracePeriodSeconds: number = 5) {
    this.gracePeriodMs = gracePeriodSeconds * 1000;
  }

  public getReconnectingState(): boolean {
    return this.isReconnecting;
  }

  public startGracePeriod(onTimeout: () => void): void {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    if (this.graceTimer) clearTimeout(this.graceTimer);

    this.graceTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.purgeAndRejectAll("WS重连超时(N秒)发送失败");
      onTimeout();
    }, this.gracePeriodMs);
  }

  public enqueuePendingMessage<T>(messageId: string, data: any): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pendingQueue.push({
        messageId,
        data,
        createdAt: Date.now(),
        resolve,
        reject,
      });
    });
  }

  public async flushQueue(sendFn: (data: any) => Promise<void>): Promise<void> {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    this.isReconnecting = false;

    const queueToFlush = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const msg of queueToFlush) {
      try {
        await sendFn(msg.data);
        msg.resolve(true as any);
      } catch (err) {
        msg.reject(err);
      }
    }
  }

  public purgeAndRejectAll(errorMsg: string): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    this.isReconnecting = false;

    const queueToPurge = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const msg of queueToPurge) {
      msg.reject(new Error(errorMsg));
    }
  }
}
