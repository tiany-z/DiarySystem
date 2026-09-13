import { returnError, returnSuccess } from "../flow/result.js";
export function parseWsMessage(raw) {
    try {
        const str = typeof raw === "string" ? raw : raw.toString("utf-8");
        const parsed = JSON.parse(str);
        if (!parsed.type) {
            return returnError("Invalid WS message: missing type");
        }
        return returnSuccess(parsed);
    }
    catch (error) {
        return returnError(`Parse WS message failed: ${String(error)}`);
    }
}
export function stringifyWsMessage(packet) {
    return JSON.stringify(packet);
}
//# sourceMappingURL=wsProtocol.js.map