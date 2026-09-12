import {
  declare,
  returnError,
  returnSuccess,
  StandardResult,
} from "#core";

const diariesTable = declare.table("diaries");
const idCol = declare.column(diariesTable, "id");
const isPublicCol = declare.column(diariesTable, "is_public");

export const api = {
  routePath: "/api/diary/detail",
  authRequired: false,
  astConfig: {
    type: "SELECT",
    compose: {
      columns: [
        idCol,
        declare.column(diariesTable, "user_id"),
        declare.column(diariesTable, "title"),
        declare.column(diariesTable, "content"),
        declare.column(diariesTable, "weather"),
        declare.column(diariesTable, "mood"),
        isPublicCol,
        declare.column(diariesTable, "created_at"),
      ],
      where: [declare.where.compare(idCol, "=", declare.customValue("-!!value!!-"))],
    },
  },
  run: null as any,
  handler: async (reqCtx: { query?: any; body?: any }, ctx: any): Promise<StandardResult<any>> => {
    try {
      const diaryId = reqCtx.query?.id || reqCtx.body?.id;
      if (!diaryId) {
        return returnError("缺少日记 ID 参数");
      }

      if (!api.run) {
        return returnError("AST Run function not compiled");
      }

      const runRes = await api.run({ whereParams: [diaryId] }, ctx);
      if (runRes.status === 0) return returnError(runRes.content);

      const items = runRes.data;
      if (!items || items.length === 0) {
        return returnError("日记不存在或已被删除");
      }

      const diary = items[0];
      const isPublic = diary.is_public === 1 || diary.is_public === true;

      // 若为私密随笔，则严格要求登录且必须是作者本人
      if (!isPublic) {
        if (!ctx.userPayload?.userId) {
          return returnError("该日记已被作者设为私密，请登录后查看");
        }
        if (diary.user_id !== ctx.userPayload?.userId) {
          return returnError("无权查看该私密日记");
        }
      }

      return returnSuccess(diary);
    } catch (error) {
      return returnError(`获取日记详情异常: ${String(error)}`);
    }
  },
};

export default api;
