import { executeQuery, genUUID, hashPassword, returnError, returnSuccess, SUPER_ADMIN_USERNAME, } from "#core";
export const api = {
    routePath: "/api/admin/users/create",
    authRequired: true,
    handler: async (reqCtx, ctx) => {
        try {
            const currentUser = reqCtx?.user || ctx?.userPayload || ctx?.user;
            if (!currentUser || currentUser.username !== SUPER_ADMIN_USERNAME) {
                return returnError("无权限访问：仅系统总管理员 tiany 允许创建账户");
            }
            const { username, password, nickname } = reqCtx.body || {};
            const cleanUsername = (username || "").trim();
            const cleanPassword = (password || "").trim();
            const cleanNickname = (nickname || "").trim();
            if (!cleanUsername || !cleanPassword) {
                return returnError("用户名和初始密码不能为空");
            }
            if (cleanUsername.length < 2 || cleanUsername.length > 32) {
                return returnError("用户名长度建议在 2 到 32 个字符之间");
            }
            if (cleanPassword.length < 6) {
                return returnError("初始密码长度不能少于 6 位");
            }
            // 1. 检查用户名是否已存在
            const existRes = await executeQuery("SELECT id FROM users WHERE username = ? LIMIT 1", [cleanUsername]);
            if (existRes.status === 0)
                return returnError(existRes.content);
            if (existRes.data && existRes.data.length > 0) {
                return returnError(`用户名 [${cleanUsername}] 已被占用，请更换其他用户名`);
            }
            // 2. 加盐哈希密码
            const hashRes = await hashPassword(cleanPassword);
            if (hashRes.status === 0)
                return returnError(hashRes.content);
            // 3. 写入数据库
            const newId = genUUID();
            const insertSql = "INSERT INTO users (id, username, password_hash, nickname) VALUES (?, ?, ?, ?)";
            const insertRes = await executeQuery(insertSql, [
                newId,
                cleanUsername,
                hashRes.data,
                cleanNickname || cleanUsername,
            ]);
            if (insertRes.status === 0) {
                return returnError(`创建用户失败: ${insertRes.content}`);
            }
            return returnSuccess({
                id: newId,
                username: cleanUsername,
                nickname: cleanNickname || cleanUsername,
                created_at: new Date().toISOString(),
            });
        }
        catch (error) {
            return returnError(`创建用户失败: ${String(error)}`);
        }
    },
};
export default api;
//# sourceMappingURL=index.js.map