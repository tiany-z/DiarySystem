import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SUCCESS"] = 4] = "SUCCESS";
})(LogLevel || (LogLevel = {}));
const COLOR_RESET = "\x1b[0m";
const COLOR_GRAY = "\x1b[37m"; // 明亮浅白灰，确保在任何终端深黑背景下均清晰可辨，彻底消除发暗问题
const COLOR_CYAN = "\x1b[36m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_RED = "\x1b[31m";
const COLOR_MAGENTA = "\x1b[35m";
const COLOR_BOLD = "\x1b[1m";
function getLevelBadge(level) {
    switch (level) {
        case LogLevel.DEBUG:
            return { label: "DEBUG", color: COLOR_MAGENTA };
        case LogLevel.INFO:
            return { label: "INFO ", color: COLOR_CYAN };
        case LogLevel.WARN:
            return { label: "WARN ", color: COLOR_YELLOW };
        case LogLevel.ERROR:
            return { label: "ERROR", color: COLOR_RED };
        case LogLevel.SUCCESS:
            return { label: "SUCC ", color: COLOR_GREEN };
        default:
            return { label: "INFO ", color: COLOR_CYAN };
    }
}
function formatTimestamp() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}
export class ScreenLogger {
    defaultModuleName = "DiaryBackend";
    minLevel = LogLevel.INFO;
    constructor(defaultModuleName = "DiaryBackend") {
        this.defaultModuleName = defaultModuleName;
        const envLevel = (process.env.LOG_LEVEL || "INFO").toUpperCase();
        if (envLevel === "DEBUG")
            this.minLevel = LogLevel.DEBUG;
        else if (envLevel === "WARN")
            this.minLevel = LogLevel.WARN;
        else if (envLevel === "ERROR")
            this.minLevel = LogLevel.ERROR;
        else
            this.minLevel = LogLevel.INFO;
    }
    setModuleName(name) {
        this.defaultModuleName = name;
    }
    setMinLevel(level) {
        this.minLevel = level;
    }
    // 兼容原 LogClient.init 接口
    init(config) {
        if (config?.clientName) {
            this.defaultModuleName = config.clientName;
        }
    }
    // 兼容原 LogClient.testConnection
    async testConnection() {
        return { success: true };
    }
    close() {
        // 控制台日志无需特殊关闭处理
    }
    log(level, message, metadata, module) {
        try {
            if (level < this.minLevel) {
                return returnSuccess(true);
            }
            const timestamp = formatTimestamp();
            const badge = getLevelBadge(level);
            const mod = module || this.defaultModuleName;
            const timeStr = `${COLOR_GRAY}${timestamp}${COLOR_RESET}`;
            const badgeStr = `${COLOR_BOLD}${badge.color}[${badge.label}]${COLOR_RESET}`;
            const modStr = `${COLOR_BOLD}${COLOR_GRAY}[${mod}]${COLOR_RESET}`;
            const msgStr = `${badge.color}${message}${COLOR_RESET}`;
            let metaStr = "";
            if (metadata && Object.keys(metadata).length > 0) {
                metaStr = ` ${COLOR_GRAY}${JSON.stringify(metadata)}${COLOR_RESET}`;
            }
            const formattedLine = `${timeStr} ${badgeStr} ${modStr} ${msgStr}${metaStr}`;
            if (level === LogLevel.ERROR) {
                console.error(formattedLine);
            }
            else if (level === LogLevel.WARN) {
                console.warn(formattedLine);
            }
            else {
                console.log(formattedLine);
            }
            return returnSuccess(true);
        }
        catch (error) {
            return returnError(tryCatchErrorToString(error));
        }
    }
    sendLog(level, message, metadata, module) {
        let numLevel = LogLevel.INFO;
        if (typeof level === "number") {
            numLevel = level;
        }
        else if (level === "DEBUG") {
            numLevel = LogLevel.DEBUG;
        }
        else if (level === "WARN") {
            numLevel = LogLevel.WARN;
        }
        else if (level === "ERROR") {
            numLevel = LogLevel.ERROR;
        }
        else if (level === "SUCCESS") {
            numLevel = LogLevel.SUCCESS;
        }
        return this.log(numLevel, message, metadata, module);
    }
    info(message, metadata, module) {
        return this.log(LogLevel.INFO, message, metadata, module);
    }
    warn(message, metadata, module) {
        return this.log(LogLevel.WARN, message, metadata, module);
    }
    error(message, metadata, module) {
        return this.log(LogLevel.ERROR, message, metadata, module);
    }
    success(message, metadata, module) {
        return this.log(LogLevel.SUCCESS, message, metadata, module);
    }
    debug(message, metadata, module) {
        return this.log(LogLevel.DEBUG, message, metadata, module);
    }
    createLogger(moduleName) {
        return {
            info: (message, metadata) => this.info(message, metadata, moduleName),
            warn: (message, metadata) => this.warn(message, metadata, moduleName),
            error: (message, metadata) => this.error(message, metadata, moduleName),
            success: (message, metadata) => this.success(message, metadata, moduleName),
            debug: (message, metadata) => this.debug(message, metadata, moduleName),
        };
    }
}
export const LogClient = new ScreenLogger("DiaryBackend");
export const remoteLogClient = LogClient;
export function createLogger(moduleName = "DiaryBackend") {
    return LogClient.createLogger(moduleName);
}
//# sourceMappingURL=logger.js.map