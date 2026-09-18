import { agentEngine, decryptApiKey, executeQuery, genUUID, LogClient, returnError, returnSuccess, SseStreamController, tryCatchErrorToString, } from "../../../core/index.js";
/**
 * 智能首句生成会话标题
 */
function generateAutoTitle(firstUserMessage) {
    const clean = firstUserMessage
        .replace(/[#*`_>\[\]\n\r]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!clean)
        return "新对话";
    return clean.length > 24 ? clean.slice(0, 24) + "..." : clean;
}
export const api = {
    routePath: "/api/ai/chat",
    authRequired: true,
    handler: async (reqCtx, ctx) => {
        const currentUserId = reqCtx?.user?.userId ||
            ctx?.userPayload?.userId ||
            ctx?.user?.userId ||
            ctx?.userPayload?.id;
        if (!currentUserId) {
            return returnError("未鉴权请求或用户登录态失效");
        }
        const method = (reqCtx.req.method || "POST").toUpperCase();
        if (method !== "POST") {
            return returnError(`不支持的请求方式: ${method}`);
        }
        const body = reqCtx.body || {};
        const message = (body.message || "").trim();
        let conversationId = (body.conversationId || "").trim();
        if (!message) {
            return returnError("提问内容不能为空");
        }
        // 1. 读取用户私有化 AI 配置
        const userRes = await executeQuery("SELECT username, nickname, ai_base_url, ai_model_name, ai_api_key FROM users WHERE id = ? LIMIT 1;", [currentUserId]);
        if (userRes.status === 0 || !userRes.data || userRes.data.length === 0) {
            return returnError("未找到当前用户信息");
        }
        const userRow = userRes.data[0];
        const rawApiKey = userRow.ai_api_key;
        const baseUrl = (userRow.ai_base_url || "").trim();
        const modelName = (userRow.ai_model_name || "").trim();
        if (!rawApiKey || !baseUrl || !modelName) {
            return returnError("请先在右上角「个人资料 -> AI 助手设置」中配置大模型的 Base URL、Model Name 与 API Key");
        }
        const decryptedKey = decryptApiKey(rawApiKey);
        if (!decryptedKey) {
            return returnError("用户 AI 凭证解密失败，请重新配置 API Key");
        }
        // 2. 验证或新建会话实体
        let convTitle = "新对话";
        if (conversationId) {
            const convCheck = await executeQuery("SELECT id, title FROM ai_conversations WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1;", [conversationId, currentUserId]);
            if (convCheck.status === 0 || !convCheck.data || convCheck.data.length === 0) {
                return returnError("目标会话不存在或已被删除");
            }
            convTitle = convCheck.data[0].title;
        }
        else {
            conversationId = genUUID();
            convTitle = generateAutoTitle(message);
            const createConvRes = await executeQuery("INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?);", [conversationId, currentUserId, convTitle]);
            if (createConvRes.status === 0) {
                return returnError(`自动创建会话失败: ${createConvRes.content}`);
            }
        }
        // 3. 将用户提问持久化到 ai_messages
        const userMsgId = genUUID();
        const saveUserMsgRes = await executeQuery("INSERT INTO ai_messages (id, conversation_id, user_id, role, content) VALUES (?, ?, ?, 'user', ?);", [userMsgId, conversationId, currentUserId, message]);
        if (saveUserMsgRes.status === 0) {
            return returnError(`记录用户消息失败: ${saveUserMsgRes.content}`);
        }
        // 4. 加载历史上下文（取最近 20 条，按时序排序）
        const historyRes = await executeQuery(`SELECT role, content, thought, tool_calls, tool_call_id
       FROM ai_messages
       WHERE conversation_id = ? AND user_id = ?
       ORDER BY created_at DESC
       LIMIT 20;`, [conversationId, currentUserId]);
        const historyRows = (historyRes.data || []).reverse();
        // 严格遵循 OpenAI API 规范：历史上下文传递纯净的 user 与 assistant 内容，
        // 杜绝因历史中间态 tool_calls 缺少配对的 tool_call_id 导致外部大模型抛出 400 校验错误。
        const chatMessages = historyRows
            .filter((r) => r.role === "user" || r.role === "assistant")
            .map((r) => ({
            role: r.role,
            content: r.content || "",
        }));
        // 5. 启动 SSE 流式控制器接管底层网络长连接
        if (!reqCtx.res) {
            return returnError("HTTP 网关未挂载原生 ServerResponse，无法建立 SSE 流");
        }
        const sse = new SseStreamController(reqCtx.req, reqCtx.res);
        // 下发首个会话握手事件
        sse.sendEvent("conversation", {
            conversationId,
            title: convTitle,
        });
        // 6. 运行 AgentEngine 并通过 SSE 实时分流推送
        let accumulatedThoughts = "";
        let accumulatedContent = "";
        const executedToolCalls = [];
        const assistantMsgId = genUUID();
        try {
            await agentEngine.execute({
                userConfig: {
                    baseUrl,
                    apiKey: decryptedKey,
                    modelName,
                },
                userContext: {
                    userId: currentUserId,
                    username: userRow.username,
                    nickname: userRow.nickname,
                },
                messages: chatMessages,
                signal: sse.signal,
                callbacks: {
                    onThoughtChunk: (chunk) => {
                        accumulatedThoughts += chunk;
                        sse.sendEvent("thought", { delta: chunk });
                    },
                    onContentChunk: (chunk) => {
                        accumulatedContent += chunk;
                        sse.sendEvent("chunk", { delta: chunk });
                    },
                    onToolCallStart: (toolCall) => {
                        executedToolCalls.push({
                            id: toolCall.id,
                            name: toolCall.name,
                            args: toolCall.args,
                            status: "running",
                        });
                        sse.sendEvent("tool_call", {
                            id: toolCall.id,
                            tool: toolCall.name,
                            args: toolCall.args,
                        });
                    },
                    onToolCallResult: (toolResult) => {
                        const idx = executedToolCalls.findIndex((t) => t.id === toolResult.id);
                        if (idx >= 0) {
                            executedToolCalls[idx].summary = toolResult.summary;
                            executedToolCalls[idx].status = toolResult.success ? "success" : "failed";
                        }
                        sse.sendEvent("tool_result", {
                            id: toolResult.id,
                            tool: toolResult.name,
                            summary: toolResult.summary,
                            success: toolResult.success,
                            data: toolResult.data,
                        });
                    },
                    onFinish: () => { },
                    onError: (err) => {
                        LogClient.error(`Agent 引擎执行异常: ${err.message}`, undefined, "AgentEngine");
                    },
                },
            });
            // 7. 将 Assistant 结果持久化入库
            if (accumulatedContent || accumulatedThoughts || executedToolCalls.length > 0) {
                const toolCallsJson = executedToolCalls.length > 0 ? JSON.stringify(executedToolCalls) : null;
                await executeQuery(`INSERT INTO ai_messages (id, conversation_id, user_id, role, content, thought, tool_calls)
           VALUES (?, ?, ?, 'assistant', ?, ?, ?);`, [
                    assistantMsgId,
                    conversationId,
                    currentUserId,
                    accumulatedContent,
                    accumulatedThoughts || null,
                    toolCallsJson,
                ]).catch(() => { });
                // 刷新会话 updated_at
                await executeQuery("UPDATE ai_conversations SET updated_at = NOW() WHERE id = ?;", [conversationId]).catch(() => { });
            }
            // 下发结束事件并正常关闭长连接
            sse.finish({
                messageId: assistantMsgId,
                conversationId,
            });
            return returnSuccess(null);
        }
        catch (err) {
            const errMsg = tryCatchErrorToString(err);
            if (err.message === "OPERATION_ABORTED" || sse.signal.aborted) {
                LogClient.info(`客户端主动中止 AI 对话长连接 (会话: ${conversationId})`, undefined, "AgentChat");
                // 沉淀已有片段
                if (accumulatedContent || accumulatedThoughts) {
                    await executeQuery(`INSERT INTO ai_messages (id, conversation_id, user_id, role, content, thought, tool_calls)
             VALUES (?, ?, ?, 'assistant', ?, ?, ?);`, [
                        assistantMsgId,
                        conversationId,
                        currentUserId,
                        accumulatedContent + "\n\n*(已由用户中止生成)*",
                        accumulatedThoughts || null,
                        executedToolCalls.length > 0 ? JSON.stringify(executedToolCalls) : null,
                    ]).catch(() => { });
                }
                sse.finish({ messageId: assistantMsgId, conversationId, aborted: true });
                return returnSuccess(null);
            }
            sse.error(`AI 助手服务异常: ${errMsg}`);
            return returnSuccess(null);
        }
    },
};
//# sourceMappingURL=index.js.map