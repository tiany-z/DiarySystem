import mysql from "mysql2/promise";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
function getPool() {
    return globalThis.__diary_mysql_pool || null;
}
function setPool(p) {
    globalThis.__diary_mysql_pool = p;
}
export function initMysqlPool(config) {
    try {
        let pool = getPool();
        if (pool) {
            return returnSuccess(pool);
        }
        const dbConfig = config || {
            host: process.env.MYSQL_HOST || "localhost",
            port: parseInt(process.env.MYSQL_PORT || "3306", 10),
            user: process.env.MYSQL_USER || "root",
            password: process.env.MYSQL_PASSWORD || "",
            database: process.env.MYSQL_DB || "diary_system",
            waitForConnections: true,
            connectionLimit: parseInt(process.env.MYSQL_MAX_CONNECTIONS || "20", 10),
            queueLimit: 0,
            connectTimeout: parseInt(process.env.MYSQL_CONNECT_TIMEOUT || "10000", 10),
            timezone: process.env.MYSQL_TIMEZONE || "+08:00",
            charset: process.env.MYSQL_CHARSET || "utf8mb4",
            dateStrings: true,
            decimalNumbers: true,
        };
        pool = mysql.createPool(dbConfig);
        setPool(pool);
        return returnSuccess(pool);
    }
    catch (error) {
        return returnError(`Init MySQL Pool failed: ${tryCatchErrorToString(error)}`);
    }
}
export function getMysqlPool() {
    return getPool();
}
export async function getConnection() {
    const pool = getPool();
    if (!pool)
        return null;
    return pool.getConnection();
}
export async function executeQuery(sql, params = [], conn) {
    try {
        const targetPool = getPool();
        if (!targetPool && !conn) {
            return returnError("MySQL 数据库连接池未初始化");
        }
        // mysql2 不支持入参包含 undefined，统一将 undefined 映射为 SQL NULL
        const sanitizedParams = params.map((p) => (p === undefined ? null : p));
        let rawResult;
        if (conn) {
            rawResult = await conn.query(sql, sanitizedParams);
        }
        else {
            rawResult = await targetPool.query(sql, sanitizedParams);
        }
        const [rows] = rawResult;
        if (Array.isArray(rows)) {
            return returnSuccess(rows);
        }
        // 处理 INSERT / UPDATE / DELETE 返回的 ResultSetHeader
        const header = rows;
        const mutationRow = {
            id: header.insertId > 0 ? header.insertId : undefined,
            insertId: header.insertId,
            affectedRows: header.affectedRows,
            changedRows: header.changedRows || 0,
        };
        return returnSuccess([mutationRow]);
    }
    catch (error) {
        return returnError(`Execute MySQL Query failed: ${tryCatchErrorToString(error)}`);
    }
}
export async function closeMysqlPool() {
    try {
        const pool = getPool();
        if (pool) {
            await pool.end();
            setPool(null);
        }
        return returnSuccess(true);
    }
    catch (error) {
        return returnError(`Close MySQL Pool failed: ${tryCatchErrorToString(error)}`);
    }
}
//# sourceMappingURL=mysql.js.map