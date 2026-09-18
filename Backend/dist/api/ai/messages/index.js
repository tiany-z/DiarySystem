import { executeQuery, returnError, returnSuccess, tryCatchErrorToString, } from "../../../core/index.js";
export const api = {
    routePath: "/api/ai/messages",
    authRequired: true,
    handler: async (reqCtx, ctx) => {
        try {
            const currentUserId = reqCtx?.user?.userId ||
                ctx?.userPayload?.userId ||
                ctx?.user?.userId ||
                ctx?.userPayload?.id;
            if (!currentUserId) {
                return returnError("未鉴权请求或用户登录态失效");
            }
            const method = (reqCtx.req.method || "GET").toUpperCase();
            if (method !== "GET") {
                return returnError(`不支持的请求方式: ${method}`);
            }
            const conversationId = (reqCtx.query?.conversationId || "").trim();
            if (!conversationId) {
                return returnError("缺少必要参数 conversationId");
            }
            const safeLimit = Math.min(Math.max(Number(reqCtx.query?.limit) || 50, 1), 200);
            // 1. 验证会话归属权与有效性
            const convRes = await executeQuery("SELECT id, title FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;", [conversationId, currentUserId]);
            if (convRes.status === 0 || !convRes.data || convRes.data.length === 0) {
                return returnError("目标会话不存在或已被删除");
            }
            // 2. 查询消息时序历史 (拉取最新的 safeLimit 条并反转为时序正序)
            const msgSql = `
        SELECT id, role, content, thought, tool_calls, tool_call_id, created_at
        FROM ai_messages
        WHERE conversation_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT ?;
      `;
            const msgRes = await executeQuery(msgSql, [
                conversationId,
                currentUserId,
                safeLimit,
            ]);
            if (msgRes.status === 0 || !msgRes.data) {
                return returnError(`查询消息历史失败: ${msgRes.content}`);
            }
            const rowsInOrder = [...msgRes.data].reverse();
            const messages = rowsInOrder.map((row) => {
                let toolCalls = row.tool_calls;
                if (typeof toolCalls === "string") {
                    try {
                        toolCalls = JSON.parse(toolCalls);
                    }
                    catch {
                        toolCalls = null;
                    }
                }
                return {
                    id: row.id,
                    role: row.role,
                    content: row.content || "",
                    thought: row.thought || null,
                    toolCalls: toolCalls || null,
                    toolCallId: row.tool_call_id || null,
                    createdAt: row.created_at,
                };
            });
            return returnSuccess({
                conversationId,
                title: convRes.data[0].title,
                total: messages.length,
                messages,
            });
        }
        catch (err) {
            return returnError(`处理消息明细接口异常: ${tryCatchErrorToString(err)}`);
        }
    },
};
//# sourceMappingURL=index.js.map