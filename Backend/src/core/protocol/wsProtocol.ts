import { returnError, returnSuccess, StandardResult } from "../flow/result.js";

export type WsStageType = "SEARCHING" | "THINKING" | "REPLYING" | "IDLE";

export interface SearchResultItem {
  title: string;
  snippet: string;
  url?: string;
  deepContent?: string;
}

export type WsMessageType =
  | "HANDSHAKE_ACK"
  | "HEARTBEAT"
  | "STAGE_CHANGE"
  | "STREAM_ANSWER"
  | "ERROR";

export interface WsMessagePacket<T = any> {
  type: WsMessageType | string;
  sessionId?: string;
  payload?: T;
  timestamp?: number;
  [key: string]: any;
}

export function parseWsMessage<T = any>(raw: string | Buffer): StandardResult<WsMessagePacket<T>> {
  try {
    const str = typeof raw === "string" ? raw : raw.toString("utf-8");
    const parsed = JSON.parse(str) as WsMessagePacket<T>;
    if (!parsed.type) {
      return returnError("Invalid WS message: missing type");
    }
    return returnSuccess(parsed);
  } catch (error) {
    return returnError(`Parse WS message failed: ${String(error)}`);
  }
}

export function stringifyWsMessage<T = any>(packet: WsMessagePacket<T>): string {
  return JSON.stringify(packet);
}
