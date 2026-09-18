import {
  delKV,
  executeQuery,
  hashPassword,
  returnError,
  returnSuccess,
  StandardResult,
  tryCatchErrorToString,
  verifyPassword,
} from "../../../core/index.js";

export const api = {
  routePath: "/api/user/profile",
  authRequired: true,
  handler: async (
    reqCtx: { user?: any; body?: any },
    ctx: any
  ): Promise<StandardResult<any>> => {
    try {
      const currentUserId =
        reqCtx?.user?.userId ||
        ctx?.userPayload?.userId ||
        ctx?.user?.userId ||
        ctx?.userPayload?.id;

      if (!currentUserId) {
        return returnError("未鉴权请求或用户登录态失效");
      }

      // 若提供了请求体，支持更新昵称与修改密码
      if (reqCtx?.body && Object.keys(reqCtx.body).length > 0) {
        const { nickname, oldPassword, newPassword } = reqCtx.body;

        // 1. 更新昵称
        if (typeof nickname === "string") {
          const cleanNickname = nickname.trim().slice(0, 50);
          await executeQuery("UPDATE users SET nickname = ? WHERE id = ?", [cleanNickname, currentUserId]);
        }

        // 2. 修改密码
        if (newPassword) {
          const cleanNewPass = String(newPassword).trim();
          const cleanOldPass = String(oldPassword || "").trim();

          if (!cleanOldPass) {
            return returnError("修改密码必须提供当前原密码");
          }
          if (cleanNewPass.length < 6) {
            return returnError("新密码长度不能少于 6 位");
          }

          const passRes = await executeQuery<{ password_hash: string }>(
            "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
            [currentUserId]
          );
          if (passRes.status === 0 || !passRes.data || passRes.data.length === 0) {
            return returnError("用户凭证校验失败");
          }

          const verifyRes = await verifyPassword(cleanOldPass, passRes.data[0].password_hash);
          if (verifyRes.status === 0 || !verifyRes.data) {
            return returnError("原密码错误，身份核验未通过");
          }

          const hashRes = await hashPassword(cleanNewPass);
          if (hashRes.status === 0 || !hashRes.data) {
            return returnError("新密码加密存储失败");
          }

          await executeQuery("UPDATE users SET password_hash = ? WHERE id = ?", [hashRes.data, currentUserId]);
        }

        // 驱逐本地内存缓存
        await delKV("users", currentUserId);
      }

      const userRes = await executeQuery<any>(
        "SELECT id, username, nickname, email, avatar, created_at FROM users WHERE id = ? LIMIT 1",
        [currentUserId]
      );

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
    } catch (error) {
      return returnError(`操作用户资料失败: ${tryCatchErrorToString(error)}`);
    }
  },
};

export default api;
