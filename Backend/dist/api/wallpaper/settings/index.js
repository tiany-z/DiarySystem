import { DEFAULT_TIANY_WALLPAPER_SETTINGS, getSystemSetting, returnError, returnSuccess, setSystemSetting, WALLPAPER_SETTING_KEY, } from "#core";
export const api = {
    routePath: "/api/wallpaper/settings",
    authRequired: false,
    run: null,
    handler: async (reqCtx, _ctx) => {
        const method = (reqCtx.req.method || "GET").toUpperCase();
        // 1. GET 请求：全网公开读取管理员 tiany 的背景设置
        if (method === "GET") {
            const fetchRes = await getSystemSetting(WALLPAPER_SETTING_KEY, DEFAULT_TIANY_WALLPAPER_SETTINGS);
            if (fetchRes.status === 0) {
                return returnError(`获取系统背景设置失败: ${fetchRes.content}`);
            }
            return returnSuccess(fetchRes.data);
        }
        // 2. POST / PUT 请求：仅允许超级管理员 tiany 修改并持久化写入 MySQL 数据库
        if (method === "POST" || method === "PUT") {
            const currentUser = reqCtx.user;
            if (!currentUser || currentUser.username !== "tiany") {
                return returnError("权限不足：当前系统背景效果已由管理员 tiany 统一设定锁定，仅 tiany 账号具有调制保存权限");
            }
            const body = reqCtx.body || {};
            const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
            const rawBlur = typeof body.blur === "number" ? body.blur : 8;
            const blur = Math.max(0, Math.min(30, Math.round(rawBlur)));
            const rawOpacity = typeof body.opacity === "number" ? body.opacity : 0.35;
            const opacity = Math.max(0.1, Math.min(0.85, parseFloat(rawOpacity.toFixed(2))));
            const currentIndex = typeof body.currentIndex === "number" ? Math.max(0, body.currentIndex) : 0;
            const selectedWallpaperUrl = typeof body.selectedWallpaperUrl === "string" && body.selectedWallpaperUrl.trim()
                ? body.selectedWallpaperUrl.trim()
                : DEFAULT_TIANY_WALLPAPER_SETTINGS.selectedWallpaperUrl;
            const title = typeof body.title === "string" ? body.title : undefined;
            const copyright = typeof body.copyright === "string" ? body.copyright : undefined;
            const payload = {
                enabled,
                blur,
                opacity,
                currentIndex,
                selectedWallpaperUrl,
                title,
                copyright,
            };
            const saveRes = await setSystemSetting(WALLPAPER_SETTING_KEY, payload, "tiany");
            if (saveRes.status === 0) {
                return returnError(`保存系统背景设置失败: ${saveRes.content}`);
            }
            return returnSuccess(payload);
        }
        return returnError(`不支持的 HTTP 方法: ${method}`);
    },
};
export default api;
//# sourceMappingURL=index.js.map