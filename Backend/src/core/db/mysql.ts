import mysql from "mysql2/promise";
import type { Pool, PoolConnection, PoolOptions, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { returnError, returnSuccess, StandardResult, tryCatchErrorToString } from "../flow/result.js";

let pool: Pool | null = null;

export function initMysqlPool(config?: PoolOptions): StandardResult<Pool> {
  try {
    if (pool) {
      return returnSuccess(pool);
    }

    const dbConfig: PoolOptions = config || {
      host: process.env.MYSQL_HOST || "localhost",
      port: parseInt(process.env.MYSQL_PORT || "3306", 10),
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DB || "diary_system",
      waitForConnections: true,
      connectionLimit: parseInt(process.env.MYSQL_MAX_CONNECTIONS || "20", 10),
      queueLimit: 0,
      dateStrings: true,
      decimalNumbers: true,
    };

    pool = mysql.createPool(dbConfig);

    return returnSuccess(pool);
  } catch (error) {
    return returnError(`Init MySQL Pool failed: ${tryCatchErrorToString(error)}`);
  }
}

export function getMysqlPool(): Pool | null {
  return pool;
}

export async function getConnection(): Promise<PoolConnection | null> {
  if (!pool) return null;
  return pool.getConnection();
}

export interface MutationResult {
  insertId: number;
  affectedRows: number;
  changedRows?: number;
  [key: string]: any;
}

export async function executeQuery<T = any>(
  sql: string,
  params: any[] = [],
  conn?: PoolConnection
): Promise<StandardResult<T[]>> {
  try {
    const targetPool = pool;
    if (!targetPool && !conn) {
      return returnError("MySQL 数据库连接池未初始化");
    }

    // mysql2 不支持入参包含 undefined，统一将 undefined 映射为 SQL NULL
    const sanitizedParams = params.map((p) => (p === undefined ? null : p));

    let rawResult: any;
    if (conn) {
      rawResult = await conn.query(sql, sanitizedParams);
    } else {
      rawResult = await targetPool!.query(sql, sanitizedParams);
    }

    const [rows] = rawResult;

    if (Array.isArray(rows)) {
      return returnSuccess(rows as T[]);
    }

    // 处理 INSERT / UPDATE / DELETE 返回的 ResultSetHeader
    const header = rows as ResultSetHeader;
    const mutationRow: any = {
      id: header.insertId > 0 ? header.insertId : undefined,
      insertId: header.insertId,
      affectedRows: header.affectedRows,
      changedRows: (header as any).changedRows || 0,
    };

    return returnSuccess([mutationRow] as T[]);
  } catch (error) {
    return returnError(`Execute MySQL Query failed: ${tryCatchErrorToString(error)}`);
  }
}

export async function closeMysqlPool(): Promise<StandardResult<boolean>> {
  try {
    if (pool) {
      await pool.end();
      pool = null;
    }
    return returnSuccess(true);
  } catch (error) {
    return returnError(`Close MySQL Pool failed: ${tryCatchErrorToString(error)}`);
  }
}
