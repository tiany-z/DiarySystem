import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../flow/result.js";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}

const COLOR_RESET = "\x1b[0m";
const COLOR_GRAY = "\x1b[37m"; // 明亮浅白灰，确保在任何终端深黑背景下均清晰可辨，彻底消除发暗问题
const COLOR_CYAN = "\x1b[36m";
const COLOR_GREEN = "\x1b[32m";
const COLOR_YELLOW = "\x1b[33m";
const COLOR_RED = "\x1b[31m";
const COLOR_MAGENTA = "\x1b[35m";
const COLOR_BOLD = "\x1b[1m";

function getLevelBadge(level: LogLevel): { label: string; color: string } {
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

function formatTimestamp(): string {
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
  private defaultModuleName: string = "DiaryBackend";
  private minLevel: LogLevel = LogLevel.INFO;

  constructor(defaultModuleName: string = "DiaryBackend") {
    this.defaultModuleName = defaultModuleName;
    const envLevel = (process.env.LOG_LEVEL || "INFO").toUpperCase();
    if (envLevel === "DEBUG") this.minLevel = LogLevel.DEBUG;
    else if (envLevel === "WARN") this.minLevel = LogLevel.WARN;
    else if (envLevel === "ERROR") this.minLevel = LogLevel.ERROR;
    else this.minLevel = LogLevel.INFO;
  }

  public setModuleName(name: string) {
    this.defaultModuleName = name;
  }

  public setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  // 兼容原 LogClient.init 接口
  public init(config?: { clientName?: string; [key: string]: any }): void {
    if (config?.clientName) {
      this.defaultModuleName = config.clientName;
    }
  }

  // 兼容原 LogClient.testConnection
  public async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  public close(): void {
    // 控制台日志无需特殊关闭处理
  }

  public log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    module?: string
  ): StandardResult<boolean> {
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
      } else if (level === LogLevel.WARN) {
        console.warn(formattedLine);
      } else {
        console.log(formattedLine);
      }

      return returnSuccess(true);
    } catch (error) {
      return returnError(tryCatchErrorToString(error));
    }
  }

  public sendLog(
    level: LogLevel | "DEBUG" | "INFO" | "WARN" | "ERROR" | "SUCCESS",
    message: string,
    metadata?: Record<string, any>,
    module?: string
  ): StandardResult<boolean> {
    let numLevel: LogLevel = LogLevel.INFO;
    if (typeof level === "number") {
      numLevel = level;
    } else if (level === "DEBUG") {
      numLevel = LogLevel.DEBUG;
    } else if (level === "WARN") {
      numLevel = LogLevel.WARN;
    } else if (level === "ERROR") {
      numLevel = LogLevel.ERROR;
    } else if (level === "SUCCESS") {
      numLevel = LogLevel.SUCCESS;
    }
    return this.log(numLevel, message, metadata, module);
  }

  public info(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean> {
    return this.log(LogLevel.INFO, message, metadata, module);
  }

  public warn(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean> {
    return this.log(LogLevel.WARN, message, metadata, module);
  }

  public error(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean> {
    return this.log(LogLevel.ERROR, message, metadata, module);
  }

  public success(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean> {
    return this.log(LogLevel.SUCCESS, message, metadata, module);
  }

  public debug(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean> {
    return this.log(LogLevel.DEBUG, message, metadata, module);
  }

  public createLogger(moduleName: string) {
    return {
      info: (message: string, metadata?: Record<string, any>) => this.info(message, metadata, moduleName),
      warn: (message: string, metadata?: Record<string, any>) => this.warn(message, metadata, moduleName),
      error: (message: string, metadata?: Record<string, any>) => this.error(message, metadata, moduleName),
      success: (message: string, metadata?: Record<string, any>) => this.success(message, metadata, moduleName),
      debug: (message: string, metadata?: Record<string, any>) => this.debug(message, metadata, moduleName),
    };
  }
}

export const LogClient = new ScreenLogger("DiaryBackend");
export const remoteLogClient = LogClient;

export function createLogger(moduleName: string = "DiaryBackend") {
  return LogClient.createLogger(moduleName);
}
