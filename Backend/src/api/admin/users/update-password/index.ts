import {
  delKV,
  executeQuery,
  hashPassword,
  returnError,
  returnSuccess,
  StandardResult,
  SUPER_ADMIN_USERNAME,
} from "#core";

export const api = {
  routePath: "/api/admin/users/update-password",
  authRequired: true,
  handler: async (reqCtx: any, ctx: any): Promise<StandardResult<any>> => {
    try {
      const currentUser = reqCtx?.user || ctx?.userPayload || ctx?.user;
      if (!currentUser || currentUser.username !== SUPER_ADMIN_USERNAME) {
        return returnError("无权限访问：仅系统总管理员 tiany 允许修改用户密码");
      }

      const { userId, newPassword } = reqCtx.body || {};
      const cleanUserId = (userId || "").trim();
      const cleanPassword = (newPassword || "").trim();

      if (!cleanUserId || !cleanPassword) {
        return returnError("用户 ID 与新密码不能为空");
      }

      if (cleanPassword.length < 6) {
        return returnError("新密码长度不能少于 6 位");
      }

      // 1. 检查目标用户是否存在
      const userRes = await executeQuery<{ id: string; username: string }>(
        "SELECT id, username FROM users WHERE id = ? LIMIT 1",
        [cleanUserId]
      );
      if (userRes.status === 0) return returnError(userRes.content);
      if (!userRes.data || userRes.data.length === 0) {
        return returnError("目标用户不存在");
      }

      const targetUser = userRes.data[0];

      // 2. 加盐哈希新密码
      const hashRes = await hashPassword(cleanPassword);
      if (hashRes.status === 0) return returnError(hashRes.content);

      // 3. 更新密码哈希
      const updateSql = "UPDATE users SET password_hash = ? WHERE id = ?";
      const updateRes = await executeQuery(updateSql, [hashRes.data, cleanUserId]);
      if (updateRes.status === 0) return returnError(updateRes.content);

      // 4. 驱逐目标用户内存缓存
      await delKV("users", cleanUserId);

      return returnSuccess({
        id: targetUser.id,
        username: targetUser.username,
        updated: true,
      });
    } catch (error) {
      return returnError(`修改密码失败: ${String(error)}`);
    }
  },
};

export default api;
