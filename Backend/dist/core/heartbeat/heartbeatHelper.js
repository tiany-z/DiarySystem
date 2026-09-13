export function buildHeartbeatKey(nodeId) {
    return `backend:heartbeat:${nodeId}`;
}
export function buildHeartbeatPayload(nodeId, lanIp, port, activeWsConnections, cpuUsagePct, memoryUsageBytes) {
    return {
        nodeId,
        lanIp,
        port,
        activeWsConnections,
        cpuUsagePct,
        memoryUsageBytes,
        timestamp: Date.now(),
    };
}
export function parseHeartbeatPayload(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=heartbeatHelper.js.map