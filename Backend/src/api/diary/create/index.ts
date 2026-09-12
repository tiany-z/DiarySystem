import {
  declare,
  genUUID,
  returnError,
  returnSuccess,
  StandardResult,
} from "#core";

const diariesTable = declare.table("diaries");

export const api = {
  routePath: "/api/diary/create",
  authRequired: true,
  astConfig: {
    type: "INSERT",
    compose: {
      table: diariesTable,
      columns: [
        declare.column(diariesTable, "user_id"),
        declare.column(diariesTable, "title"),
        declare.column(diariesTable, "content"),
        declare.column(diariesTable, "weather"),
        declare.column(diariesTable, "mood"),
        declare.column(diariesTable, "is_public"),
      ],
    },
  },
  run: null as any,
  handler: async (reqCtx: { body: any }, ctx: any): Promise<StandardResult<any>> => {
    try {
      const userId = ctx.userPayload?.userId;
      if (!userId) {
        return returnError("未鉴权请求");
      }

      const { title, content, weather, mood, is_public } = reqCtx.body;
      if (!title || typeof title !== "string" || !title.trim()) {
        return returnError("日记标题不能为空");
      }

      const finalContent = typeof content === "string" ? content : "";
      const finalIsPublic = is_public === false || is_public === 0 || is_public === "0" ? 0 : 1;

      if (!api.run) {
        return returnError("AST Run function not compiled");
      }

      // 执行 AST 预编译的 INSERT (MySQL 内核自动补齐并生成 UUID 主键)
      const runRes = await api.run(
        [userId, title.trim(), finalContent, weather || "Sunny", mood || "Happy", finalIsPublic],
        ctx
      );

      if (runRes.status === 0) return returnError(runRes.content);
      const diaryId = runRes.data.id;

      const now = new Date().toISOString();
      return returnSuccess({
        id: diaryId,
        title,
        content,
        weather: weather || "Sunny",
        mood: mood || "Happy",
        is_public: finalIsPublic,
        createdAt: now,
        created_at: now,
      });
    } catch (error) {
      return returnError(`创建日记失败: ${String(error)}`);
    }
  },
};

export default api;
