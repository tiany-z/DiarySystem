import { StandardResult } from "../flow/result.js";
export type WsStageType = "SEARCHING" | "THINKING" | "REPLYING" | "IDLE";
export interface SearchResultItem {
    title: string;
    snippet: string;
    url?: string;
    deepContent?: string;
}
export type WsMessageType = "HANDSHAKE_ACK" | "HEARTBEAT" | "STAGE_CHANGE" | "STREAM_ANSWER" | "ERROR";
export interface WsMessagePacket<T = any> {
    type: WsMessageType | string;
    sessionId?: string;
    payload?: T;
    timestamp?: number;
    [key: string]: any;
}
export declare function parseWsMessage<T = any>(raw: string | Buffer): StandardResult<WsMessagePacket<T>>;
export declare function stringifyWsMessage<T = any>(packet: WsMessagePacket<T>): string;
//# sourceMappingURL=wsProtocol.d.ts.map