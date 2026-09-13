import { StandardResult } from "../flow/result.js";
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4
}
export declare class ScreenLogger {
    private defaultModuleName;
    private minLevel;
    constructor(defaultModuleName?: string);
    setModuleName(name: string): void;
    setMinLevel(level: LogLevel): void;
    init(config?: {
        clientName?: string;
        [key: string]: any;
    }): void;
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    close(): void;
    log(level: LogLevel, message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    sendLog(level: LogLevel | "DEBUG" | "INFO" | "WARN" | "ERROR" | "SUCCESS", message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    info(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    warn(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    error(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    success(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    debug(message: string, metadata?: Record<string, any>, module?: string): StandardResult<boolean>;
    createLogger(moduleName: string): {
        info: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
        warn: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
        error: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
        success: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
        debug: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
    };
}
export declare const LogClient: ScreenLogger;
export declare const remoteLogClient: ScreenLogger;
export declare function createLogger(moduleName?: string): {
    info: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
    warn: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
    error: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
    success: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
    debug: (message: string, metadata?: Record<string, any>) => StandardResult<boolean>;
};
//# sourceMappingURL=logger.d.ts.map