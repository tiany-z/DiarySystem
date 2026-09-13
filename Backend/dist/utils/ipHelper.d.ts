import http from "http";
export interface IpGeoResult {
    queryIp: string;
    country: string;
    regionName: string;
    city: string;
    isp: string;
    org?: string;
    timezone: string;
}
export declare function sanitizeIp(rawIp: string | null | undefined): string | null;
export declare function parseForwardedHeader(headerValue: string | string[] | undefined): string[];
export declare function parseRfcForwardedHeader(headerValue: string | string[] | undefined): string[];
export declare function extractClientIp(req: http.IncomingMessage): string;
export declare function isPrivateIp(ip: string): boolean;
//# sourceMappingURL=ipHelper.d.ts.map