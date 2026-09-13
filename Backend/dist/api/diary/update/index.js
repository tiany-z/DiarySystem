import { declare, executeQuery, returnError, returnSuccess, } from "#core";
const diariesTable = declare.table("diaries");
export const api = {
    routePath: "/api/diary/update",
    authRequired: true,
    astConfig: {
        type: "UPDATE",
    },
    run: null,
    handler: async (reqCtx, ctx) => {
        try {
            const { id, title, content, weather, mood, is_public } = reqCtx.body;
            if (!id) {
                return returnError("缺少日记 ID");
            }
            // 验证日记归属权
            const checkRes = await executeQuery("SELECT user_id FROM diaries WHERE id = ?", [id]);
            if (checkRes.status === 0 || !checkRes.data?.[0]) {
                return returnError("日记不存在或已被删除");
            }
            if (checkRes.data[0].user_id !== ctx.userPayload?.userId) {
                return returnError("无权修改该日记");
            }
            const updateData = {};
            if (title !== undefined) {
                if (typeof title !== "string" || !title.trim()) {
                    return returnError("日记标题不能为空");
                }
                updateData.title = title.trim();
            }
            if (content !== undefined)
                updateData.content = typeof content === "string" ? content : "";
            if (weather !== undefined)
                updateData.weather = weather;
            if (mood !== undefined)
                updateData.mood = mood;
            if (is_public !== undefined) {
                updateData.is_public = is_public === true || is_public === 1 || is_public === "1" ? 1 : 0;
            }
            if (Object.keys(updateData).length === 0) {
                return returnError("未提供任何需要更新的字段");
            }
            if (!api.run) {
                return returnError("AST Run function not compiled");
            }
            // 执行 AST 预编译 UPDATE (含 Redis 行锁、快照暂存与 Undo 闭包压栈)
            const runRes = await api.run({
                table: diariesTable,
                targetId: id,
                updateData,
            }, ctx);
            if (runRes.status === 0)
                return returnError(runRes.content);
            return returnSuccess({
                id,
                updated: true,
                updateData,
            });
        }
        catch (error) {
            return returnError(`更新日记失败: ${String(error)}`);
        }
    },
};
export default api;
//# sourceMappingURL=index.js.map