import { declare, returnError, returnSuccess, } from "#core";
const diariesTable = declare.table("diaries");
const userIdCol = declare.column(diariesTable, "user_id");
const idCol = declare.column(diariesTable, "id");
const isPublicCol = declare.column(diariesTable, "is_public");
const createdAtCol = declare.column(diariesTable, "created_at");
export const api = {
    routePath: "/api/diary/list",
    authRequired: true,
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
            where: [declare.where.compare(userIdCol, "=", declare.customValue("-!!value!!-"))],
            orderBy: [declare.orderBy.DESC(createdAtCol)],
            limit: declare.limit.pageSize(1, 20),
        },
    },
    run: null,
    handler: async (reqCtx, ctx) => {
        try {
            const userId = ctx.userPayload?.userId;
            if (!userId) {
                return returnError("未鉴权请求");
            }
            if (!api.run) {
                return returnError("AST Run function not compiled");
            }
            // 执行 AST 预编译二段式 SELECT (ID提取 -> 行锁探测 -> Redis批量读 -> MySQL批量回源)
            const runRes = await api.run({ whereParams: [userId] }, ctx);
            if (runRes.status === 0)
                return returnError(runRes.content);
            return returnSuccess(runRes.data || []);
        }
        catch (error) {
            return returnError(`获取日记列表异常: ${String(error)}`);
        }
    },
};
export default api;
//# sourceMappingURL=index.js.map