import { executeQuery, returnError, returnSuccess, tryCatchErrorToString, } from "../../../core/index.js";
export const api = {
    routePath: "/api/user/profile",
    authRequired: true,
    handler: async (reqCtx, ctx) => {
        try {
            const currentUserId = reqCtx?.user?.userId ||
                ctx?.userPayload?.userId ||
                ctx?.user?.userId ||
                ctx?.userPayload?.id;
            if (!currentUserId) {
                return returnError("未鉴权请求或用户登录态失效");
            }
            const userRes = await executeQuery("SELECT id, username, nickname, email, avatar, created_at FROM users WHERE id = ? LIMIT 1", [currentUserId]);
            if (userRes.status === 0) {
                return returnError(userRes.content);
            }
            if (!userRes.data || userRes.data.length === 0) {
                return returnError("用户不存在");
            }
            const user = userRes.data[0];
            return returnSuccess({
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                email: user.email,
                avatar: user.avatar || null,
                created_at: user.created_at,
            });
        }
        catch (error) {
            return returnError(`获取用户资料失败: ${tryCatchErrorToString(error)}`);
        }
    },
};
export default api;
//# sourceMappingURL=index.js.map