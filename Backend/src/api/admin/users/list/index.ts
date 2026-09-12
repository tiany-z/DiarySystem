import {
  executeQuery,
  returnError,
  returnSuccess,
  StandardResult,
  SUPER_ADMIN_USERNAME,
} from "#core";

export const api = {
  routePath: "/api/admin/users/list",
  authRequired: true,
  handler: async (reqCtx: any, ctx: any): Promise<StandardResult<any>> => {
    try {
      const currentUser = reqCtx?.user || ctx?.userPayload || ctx?.user;
      if (!currentUser || currentUser.username !== SUPER_ADMIN_USERNAME) {
        return returnError("无权限访问：仅系统总管理员 tiany 允许管理用户");
      }

      const sql = `
        SELECT u.id, u.username, u.nickname, u.created_at,
               COUNT(d.id) AS note_count
        FROM users u
        LEFT JOIN diaries d ON u.id = d.user_id AND d.deleted_at IS NULL
        GROUP BY u.id, u.username, u.nickname, u.created_at
        ORDER BY (u.username = '${SUPER_ADMIN_USERNAME}') DESC, u.created_at DESC;
      `;

      const res = await executeQuery<any>(sql);
      if (res.status === 0) return returnError(res.content);

      return returnSuccess(res.data);
    } catch (error) {
      return returnError(`获取用户列表失败: ${String(error)}`);
    }
  },
};

export default api;
