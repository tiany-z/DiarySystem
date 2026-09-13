import { StandardResult } from "../flow/result.js";
export interface SystemWallpaperSettings {
    enabled: boolean;
    blur: number;
    opacity: number;
    currentIndex: number;
    selectedWallpaperUrl: string;
    title?: string;
    copyright?: string;
}
export declare const WALLPAPER_SETTING_KEY = "wallpaper_settings";
export declare const DEFAULT_TIANY_WALLPAPER_SETTINGS: SystemWallpaperSettings;
/**
 * 确保 system_settings 系统设置表存在，并在必要时初始化 tiany 的默认全局壁纸配置
 */
export declare function ensureSystemSettingsTable(): Promise<StandardResult<boolean>>;
/**
 * 获取系统键值设置
 */
export declare function getSystemSetting<T>(key: string, defaultValue: T): Promise<StandardResult<T>>;
/**
 * 保存或更新系统键值设置
 */
export declare function setSystemSetting<T>(key: string, value: T, updatedBy?: string): Promise<StandardResult<T>>;
//# sourceMappingURL=systemSettings.d.ts.map