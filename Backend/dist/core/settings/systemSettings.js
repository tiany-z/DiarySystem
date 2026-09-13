import { executeQuery } from "../db/mysql.js";
import { LogClient } from "../log/logger.js";
import { returnError, returnSuccess, tryCatchErrorToString } from "../flow/result.js";
export const WALLPAPER_SETTING_KEY = "wallpaper_settings";
export const DEFAULT_TIANY_WALLPAPER_SETTINGS = {
    enabled: true,
    blur: 8,
    opacity: 0.35,
    currentIndex: 0,
    selectedWallpaperUrl: "https://bing.biturl.top/?resolution=1920&format=image&index=0",
    title: "今日微软必应壁纸",
    copyright: "Microsoft Bing Daily Wallpaper",
};
/**
 * 确保 system_settings 系统设置表存在，并在必要时初始化 tiany 的默认全局壁纸配置
 */
export async function ensureSystemSettingsTable() {
    try {
        const createTableSql = `
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL,
        updated_by VARCHAR(64) DEFAULT 'tiany',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        const createRes = await executeQuery(createTableSql);
        if (createRes.status === 0) {
            return returnError(`创建或核验 system_settings 表失败: ${createRes.content}`);
        }
        // 检查 wallpaper_settings 是否已存在
        const checkSql = "SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1;";
        const checkRes = await executeQuery(checkSql, [WALLPAPER_SETTING_KEY]);
        if (checkRes.status === 1 && (!checkRes.data || checkRes.data.length === 0)) {
            // 写入管理员 tiany 的默认壁纸视觉方案
            const insertSql = "INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, 'tiany');";
            const insertRes = await executeQuery(insertSql, [
                WALLPAPER_SETTING_KEY,
                JSON.stringify(DEFAULT_TIANY_WALLPAPER_SETTINGS),
            ]);
            if (insertRes.status === 0) {
                return returnError(`初始化默认系统壁纸配置失败: ${insertRes.content}`);
            }
            LogClient.success("🎨 系统全局背景效果已成功初始化并持久化存入 MySQL 数据库 (管理员: tiany)", undefined, "SystemSettings");
        }
        else {
            LogClient.info("🎨 系统全局背景效果数据库状态就绪 (由管理员 tiany 统一设定)", undefined, "SystemSettings");
        }
        return returnSuccess(true);
    }
    catch (error) {
        return returnError(`初始化系统设置表异常: ${tryCatchErrorToString(error)}`);
    }
}
/**
 * 获取系统键值设置
 */
export async function getSystemSetting(key, defaultValue) {
    try {
        const sql = "SELECT setting_value, updated_by, updated_at FROM system_settings WHERE setting_key = ? LIMIT 1;";
        const res = await executeQuery(sql, [key]);
        if (res.status === 0) {
            return returnError(`读取系统设置 [${key}] 失败: ${res.content}`);
        }
        if (!res.data || res.data.length === 0) {
            return returnSuccess(defaultValue);
        }
        try {
            const parsed = JSON.parse(res.data[0].setting_value);
            return returnSuccess(parsed);
        }
        catch {
            return returnSuccess(res.data[0].setting_value);
        }
    }
    catch (error) {
        return returnError(`读取系统设置异常: ${tryCatchErrorToString(error)}`);
    }
}
/**
 * 保存或更新系统键值设置
 */
export async function setSystemSetting(key, value, updatedBy = "tiany") {
    try {
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        const sql = `
      INSERT INTO system_settings (setting_key, setting_value, updated_by, updated_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by),
        updated_at = NOW();
    `;
        const res = await executeQuery(sql, [key, serialized, updatedBy]);
        if (res.status === 0) {
            return returnError(`保存系统设置 [${key}] 失败: ${res.content}`);
        }
        return returnSuccess(value);
    }
    catch (error) {
        return returnError(`保存系统设置异常: ${tryCatchErrorToString(error)}`);
    }
}
//# sourceMappingURL=systemSettings.js.map