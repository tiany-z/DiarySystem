import { clearTableCache, delKV, executeQuery, returnError, returnSuccess, SUPER_ADMIN_USERNAME, } from "#core";
export const api = {
    routePath: "/api/admin/users/delete",
    authRequired: true,
    handler: async (reqCtx, ctx) => {
        try {
            const currentUser = reqCtx?.user || ctx?.userPayload || ctx?.user;
            if (!currentUser || currentUser.username !== SUPER_ADMIN_USERNAME) {
                return returnError("无权限访问：仅系统总管理员 tiany 允许删除账户");
            }
            const { userId } = reqCtx.body || {};
            const cleanUserId = (userId || "").trim();
            if (!cleanUserId) {
                return returnError("请指定待删除的用户 ID");
            }
            // 1. 检查目标用户
            const userRes = await executeQuery("SELECT id, username, nickname FROM users WHERE id = ? LIMIT 1", [cleanUserId]);
            if (userRes.status === 0)
                return returnError(userRes.content);
            if (!userRes.data || userRes.data.length === 0) {
                return returnError("目标用户不存在或已被删除");
            }
            const targetUser = userRes.data[0];
            // 保护总管理员自身账户不可被删除
            if (targetUser.username === SUPER_ADMIN_USERNAME) {
                return returnError("安全保护：系统总管理员 tiany 账户不可删除");
            }
            // 2. 统计待连带删除的日记数量
            const diaryCountRes = await executeQuery("SELECT COUNT(*) AS count FROM diaries WHERE user_id = ?", [cleanUserId]);
            const deletedNotesCount = diaryCountRes.data?.[0]?.count || 0;
            // 3. 核心业务要求：连带删除该账户名下的所有笔记数据 (硬删除)
            const delDiariesRes = await executeQuery("DELETE FROM diaries WHERE user_id = ?", [cleanUserId]);
            if (delDiariesRes.status === 0) {
                return returnError(`连带删除用户笔记失败: ${delDiariesRes.content}`);
            }
            // 4. 删除用户主体账户
            const delUserRes = await executeQuery("DELETE FROM users WHERE id = ?", [cleanUserId]);
            if (delUserRes.status === 0) {
                return returnError(`删除用户账户失败: ${delUserRes.content}`);
            }
            // 5. 驱逐用户及日记列表相关的内存缓存
            await delKV("users", cleanUserId);
            await clearTableCache("diaries");
            return returnSuccess({
                id: targetUser.id,
                username: targetUser.username,
                nickname: targetUser.nickname,
                deletedNotesCount,
            });
        }
        catch (error) {
            return returnError(`删除用户失败: ${String(error)}`);
        }
    },
};
export default api;
//# sourceMappingURL=index.js.map