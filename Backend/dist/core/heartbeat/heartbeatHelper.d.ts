export interface HeartbeatPayload {
    nodeId: string;
    lanIp: string;
    port: number;
    activeWsConnections: number;
    cpuUsagePct?: number;
    memoryUsageBytes?: number;
    timestamp: number;
}
export declare function buildHeartbeatKey(nodeId: string): string;
export declare function buildHeartbeatPayload(nodeId: string, lanIp: string, port: number, activeWsConnections: number, cpuUsagePct?: number, memoryUsageBytes?: number): HeartbeatPayload;
export declare function parseHeartbeatPayload(jsonStr: string): HeartbeatPayload | null;
//# sourceMappingURL=heartbeatHelper.d.ts.map