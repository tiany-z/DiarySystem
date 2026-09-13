export class WsResilienceQueue {
    isReconnecting = false;
    pendingQueue = [];
    graceTimer = null;
    gracePeriodMs;
    constructor(gracePeriodSeconds = 5) {
        this.gracePeriodMs = gracePeriodSeconds * 1000;
    }
    getReconnectingState() {
        return this.isReconnecting;
    }
    startGracePeriod(onTimeout) {
        if (this.isReconnecting)
            return;
        this.isReconnecting = true;
        if (this.graceTimer)
            clearTimeout(this.graceTimer);
        this.graceTimer = setTimeout(() => {
            this.isReconnecting = false;
            this.purgeAndRejectAll("WS重连超时(N秒)发送失败");
            onTimeout();
        }, this.gracePeriodMs);
    }
    enqueuePendingMessage(messageId, data) {
        return new Promise((resolve, reject) => {
            this.pendingQueue.push({
                messageId,
                data,
                createdAt: Date.now(),
                resolve,
                reject,
            });
        });
    }
    async flushQueue(sendFn) {
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
                msg.resolve(true);
            }
            catch (err) {
                msg.reject(err);
            }
        }
    }
    purgeAndRejectAll(errorMsg) {
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
//# sourceMappingURL=wsResilienceQueue.js.map