export interface HeartbeatPayload {
  nodeId: string;
  lanIp: string;
  port: number;
  activeWsConnections: number;
  cpuUsagePct?: number;
  memoryUsageBytes?: number;
  timestamp: number;
}

export function buildHeartbeatKey(nodeId: string): string {
  return `backend:heartbeat:${nodeId}`;
}

export function buildHeartbeatPayload(
  nodeId: string,
  lanIp: string,
  port: number,
  activeWsConnections: number,
  cpuUsagePct?: number,
  memoryUsageBytes?: number
): HeartbeatPayload {
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

export function parseHeartbeatPayload(jsonStr: string): HeartbeatPayload | null {
  try {
    return JSON.parse(jsonStr) as HeartbeatPayload;
  } catch {
    return null;
  }
}
