import type { Pool, PoolConnection, PoolOptions } from "mysql2/promise";
import { StandardResult } from "../flow/result.js";
export declare function initMysqlPool(config?: PoolOptions): StandardResult<Pool>;
export declare function getMysqlPool(): Pool | null;
export declare function getConnection(): Promise<PoolConnection | null>;
export interface MutationResult {
    insertId: number;
    affectedRows: number;
    changedRows?: number;
    [key: string]: any;
}
export declare function executeQuery<T = any>(sql: string, params?: any[], conn?: PoolConnection): Promise<StandardResult<T[]>>;
export declare function closeMysqlPool(): Promise<StandardResult<boolean>>;
//# sourceMappingURL=mysql.d.ts.map