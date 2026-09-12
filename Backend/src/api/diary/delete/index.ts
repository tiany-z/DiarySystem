import {
  declare,
  executeQuery,
  returnError,
  returnSuccess,
  StandardResult,
} from "#core";

const diariesTable = declare.table("diaries");

export const api = {
  routePath: "/api/diary/delete",
  authRequired: true,
  astConfig: {
    type: "DELETE",
  },
  run: null as any,
  handler: async (reqCtx: { body: any }, ctx: any): Promise<StandardResult<any>> => {
    try {
      const id = reqCtx.body?.id;
      if (!id) {
        return returnError("缺少需要删除的日记 ID");
      }

      // 验证日记归属权
      const checkRes = await executeQuery("SELECT user_id FROM diaries WHERE id = ?", [id]);
      if (checkRes.status === 0 || !checkRes.data?.[0]) {
        return returnError("日记不存在或已被删除");
      }
      if (checkRes.data[0].user_id !== ctx.userPayload?.userId) {
        return returnError("无权删除该日记");
      }

      if (!api.run) {
        return returnError("AST Run function not compiled");
      }

      // 执行 AST 预编译 DELETE (含 Redis 行锁、旧行快照暂存与 Undo 插回闭包压栈)
      const runRes = await api.run(
        {
          table: diariesTable,
          targetId: id,
        },
        ctx
      );

      if (runRes.status === 0) return returnError(runRes.content);

      return returnSuccess({
        id,
        deleted: true,
      });
    } catch (error) {
      return returnError(`删除日记失败: ${String(error)}`);
    }
  },
};

export default api;
