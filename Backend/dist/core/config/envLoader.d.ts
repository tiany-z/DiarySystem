import { StandardResult } from "../flow/result.js";
export declare function parseCliEnvFile(args?: Array<string>): string | null;
export declare function loadEnvFile(envPath?: string): StandardResult<Record<string, string>>;
export declare function validateRequiredEnvs(requiredKeys: string[]): StandardResult<boolean>;
export declare function printStartupError(serviceName: string, reason: string): void;
export declare function printStartupSuccess(serviceName: string, infoLines: string[]): void;
//# sourceMappingURL=envLoader.d.ts.map