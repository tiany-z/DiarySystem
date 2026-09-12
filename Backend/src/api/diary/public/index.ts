import {
  declare,
  returnError,
  returnSuccess,
  StandardResult,
} from "#core";

const diariesTable = declare.table("diaries");
const idCol = declare.column(diariesTable, "id");
const userIdCol = declare.column(diariesTable, "user_id");
const isPublicCol = declare.column(diariesTable, "is_public");
const createdAtCol = declare.column(diariesTable, "created_at");

export const api = {
  routePath: "/api/diary/public",
  authRequired: false,
  astConfig: {
    type: "SELECT",
    compose: {
      columns: [
        idCol,
        userIdCol,
        declare.column(diariesTable, "title"),
        declare.column(diariesTable, "content"),
        declare.column(diariesTable, "weather"),
        declare.column(diariesTable, "mood"),
        isPublicCol,
        createdAtCol,
      ],
      where: [declare.where.compare(isPublicCol, "=", declare.customValue("-!!value!!-"))],
      orderBy: [declare.orderBy.DESC(createdAtCol)],
      limit: declare.limit.pageSize(1, 20),
    },
  },
  run: null as any,
  handler: async (_reqCtx: any, ctx: any): Promise<StandardResult<any>> => {
    try {
      if (!api.run) {
        return returnError("AST Run function not compiled");
      }

      // 执行 AST 预编译二段式 SELECT，严格获取标记为公开 (is_public = 1) 的最新日记
      const runRes = await api.run({ whereParams: [1] }, ctx);
      if (runRes.status === 0) return returnError(runRes.content);

      return returnSuccess(runRes.data || []);
    } catch (error) {
      return returnError(`获取公开日记列表异常: ${String(error)}`);
    }
  },
};

export default api;
