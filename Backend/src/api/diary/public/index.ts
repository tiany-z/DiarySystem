import {
  executeQuery,
  returnError,
  returnSuccess,
  StandardResult,
} from "#core";

export const api = {
  routePath: "/api/diary/public",
  authRequired: false,
  handler: async (_reqCtx: any, _ctx: any): Promise<StandardResult<any>> => {
    try {
      const sql = `
        SELECT d.id, d.user_id, d.title, d.content, d.weather, d.mood, d.is_public, d.created_at,
               u.username, u.nickname, u.avatar
        FROM diaries d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.is_public = 1 AND d.deleted_at IS NULL
        ORDER BY d.created_at DESC
        LIMIT 100;
      `;
      const res = await executeQuery<any>(sql);
      if (res.status === 0) return returnError(res.content);

      return returnSuccess(res.data || []);
    } catch (error) {
      return returnError(`获取公开日记列表异常: ${String(error)}`);
    }
  },
};

export default api;
