import http from "http";
import https from "https";
import net from "net";
import { URL } from "url";

export interface IpGeoResult {
  queryIp: string;
  country: string;
  regionName: string;
  city: string;
  isp: string;
  org?: string;
  timezone: string;
}

function getFirstHeaderValue(header: string | string[] | undefined): string | undefined {
  if (!header) return undefined;
  if (Array.isArray(header)) {
    return header.length > 0 ? header[0] : undefined;
  }
  return header;
}

export function sanitizeIp(rawIp: string | null | undefined): string | null {
  if (!rawIp || typeof rawIp !== "string") return null;

  let ip = rawIp.trim().replace(/^["']|["']$/g, "");
  if (!ip) return null;

  // 剥离 IPv6 映射 IPv4 的 ::ffff: 前缀
  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.substring(7).trim();
  }

  // 剥离带端口的 IPv6: [2001:db8::1]:8080 -> 2001:db8::1
  if (ip.startsWith("[")) {
    const closingIndex = ip.indexOf("]");
    if (closingIndex !== -1) {
      ip = ip.substring(1, closingIndex).trim();
    }
  } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ip)) {
    // 剥离带端口的 IPv4: 192.168.1.1:8080 -> 192.168.1.1
    ip = ip.split(":")[0].trim();
  }

  // 规范化 localhost 与 IPv6 loopback
  if (ip === "::1" || ip.toLowerCase() === "localhost") {
    ip = "127.0.0.1";
  }

  // 校验 IP 合法性 (4: IPv4, 6: IPv6, 0: 非法)
  if (net.isIP(ip) === 0) {
    return null;
  }

  return ip;
}

export function parseForwardedHeader(headerValue: string | string[] | undefined): string[] {
  if (!headerValue) return [];

  const rawList = Array.isArray(headerValue) ? headerValue : [headerValue];
  const ips: string[] = [];

  for (const item of rawList) {
    if (typeof item !== "string") continue;
    const parts = item.split(",");
    for (const part of parts) {
      const sanitized = sanitizeIp(part);
      if (sanitized) {
        ips.push(sanitized);
      }
    }
  }

  return ips;
}

export function parseRfcForwardedHeader(headerValue: string | string[] | undefined): string[] {
  if (!headerValue) return [];

  const rawList = Array.isArray(headerValue) ? headerValue : [headerValue];
  const ips: string[] = [];

  for (const item of rawList) {
    if (typeof item !== "string") continue;
    const entries = item.split(",");
    for (const entry of entries) {
      const match = entry.match(/for=(?:"?\[?([a-zA-Z0-9:.]+)\]?(?::\d+)?"?)/i);
      if (match && match[1]) {
        const sanitized = sanitizeIp(match[1]);
        if (sanitized) {
          ips.push(sanitized);
        }
      }
    }
  }

  return ips;
}

export function extractClientIp(req: http.IncomingMessage): string {
  // 1. Cloudflare / Akamai 特别透传头
  const cfIp = sanitizeIp(getFirstHeaderValue(req.headers["cf-connecting-ip"]));
  if (cfIp) return cfIp;

  const trueClientIp = sanitizeIp(getFirstHeaderValue(req.headers["true-client-ip"]));
  if (trueClientIp) return trueClientIp;

  // 2. Nginx 反代核心 X-Real-IP
  const xRealIp = sanitizeIp(getFirstHeaderValue(req.headers["x-real-ip"]));
  if (xRealIp) return xRealIp;

  // 3. X-Client-IP
  const xClientIp = sanitizeIp(getFirstHeaderValue(req.headers["x-client-ip"]));
  if (xClientIp) return xClientIp;

  // 4. X-Forwarded-For 代理链条
  const xffList = parseForwardedHeader(req.headers["x-forwarded-for"]);
  if (xffList.length > 0) {
    return xffList[0];
  }

  // 5. RFC 7239 Forwarded 标准头部
  const rfcList = parseRfcForwardedHeader(req.headers["forwarded"]);
  if (rfcList.length > 0) {
    return rfcList[0];
  }

  // 6. X-Cluster-Client-IP
  const clusterIp = sanitizeIp(getFirstHeaderValue(req.headers["x-cluster-client-ip"]));
  if (clusterIp) return clusterIp;

  // 7. URL Query 参数探测
  if (req.url && req.url.includes("?")) {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const queryIp =
        parsedUrl.searchParams.get("client_ip") ||
        parsedUrl.searchParams.get("real_ip") ||
        parsedUrl.searchParams.get("ip");
      const sanitizedQueryIp = sanitizeIp(queryIp);
      if (sanitizedQueryIp) return sanitizedQueryIp;
    } catch {}
  }

  // 8. 原生 Socket 物理连接远端 IP
  const socketIp = sanitizeIp(req.socket?.remoteAddress || (req as any).connection?.remoteAddress);
  if (socketIp) return socketIp;

  // 9. 兜底回环 IP
  return "127.0.0.1";
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const clean = sanitizeIp(ip) || ip.replace(/^::ffff:/, "").trim();

  if (clean === "127.0.0.1" || clean === "::1" || clean === "localhost" || clean.startsWith("127.")) {
    return true;
  }

  if (clean === "0.0.0.0" || clean === "::") {
    return true;
  }

  if (clean.startsWith("10.")) return true;
  if (clean.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(clean)) return true;
  if (clean.startsWith("169.254.")) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(clean)) return true;

  const lower = clean.toLowerCase();
  if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:")) {
    return true;
  }

  return false;
}
