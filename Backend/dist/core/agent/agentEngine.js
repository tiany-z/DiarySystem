import { ToolRegistry } from "./tools/index.js";
import { ThinkingStreamParser } from "./streamParser.js";
import { buildSystemPrompt } from "./promptTemplates.js";
import { tryCatchErrorToString } from "../flow/result.js";
/**
 * 规范化 Base URL，确保兼容各类 OpenAI 规范接口
 */
export function normalizeCompletionsUrl(baseUrl) {
    let url = (baseUrl || "").trim().replace(/\/+$/, "");
    if (!url) {
        url = "https://api.openai.com/v1";
    }
    // 若用户直接输入完整路径
    if (url.endsWith("/chat/completions")) {
        return url;
    }
    // 若用户仅输入了 OpenAI 官方域名且未带版本号，自动补齐 /v1
    if (url === "https://api.openai.com" || url === "http://api.openai.com") {
        url = `${url}/v1`;
    }
    return `${url}/chat/completions`;
}
/**
 * AI Agent ReAct 自主思考与多轮工具循环决策引擎
 */
export class AgentEngine {
    static MAX_ITERATIONS = 6;
    /**
     * 执行完整的 ReAct 决策循环
     */
    async execute(options) {
        const { userConfig, userContext, messages, signal, callbacks } = options;
        const workingMessages = [];
        // 1. 组装 System Prompt (若上层未注入)
        const hasSystem = messages.some((m) => m.role === "system");
        if (!hasSystem) {
            workingMessages.push({
                role: "system",
                content: buildSystemPrompt(userContext),
            });
        }
        workingMessages.push(...messages);
        const apiUrl = normalizeCompletionsUrl(userConfig.baseUrl);
        let totalContent = "";
        const requestId = `agent_req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        try {
            // 2. 启动 ReAct 自主循环
            for (let iteration = 1; iteration <= AgentEngine.MAX_ITERATIONS; iteration++) {
                if (signal?.aborted) {
                    throw new Error("OPERATION_ABORTED");
                }
                const isLastIteration = iteration === AgentEngine.MAX_ITERATIONS;
                // 如果是最后一轮，强行收敛，不再暴露 tools
                if (isLastIteration) {
                    workingMessages.push({
                        role: "system",
                        content: "【系统提示：当前已达到最大工具分析轮次，请根据此前获取到的所有检索数据与上下文，给出最终结论与完整答复。】",
                    });
                }
                const payload = {
                    model: userConfig.modelName,
                    messages: workingMessages,
                    stream: true,
                };
                // 仅在非最后一轮提供工具列表
                if (!isLastIteration) {
                    payload.tools = ToolRegistry.getOpenAiTools();
                    payload.tool_choice = "auto";
                }
                const response = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${userConfig.apiKey || ""}`,
                    },
                    body: JSON.stringify(payload),
                    signal,
                });
                if (!response.ok) {
                    const errBody = await response.text().catch(() => "");
                    throw new Error(`大模型接口响应异常 (HTTP ${response.status}): ${errBody.slice(0, 300) || response.statusText}`);
                }
                if (!response.body) {
                    throw new Error("大模型接口未返回响应流 (response.body 为空)");
                }
                // 3. 处理单轮 SSE 流式响应
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let lineBuffer = "";
                let roundContent = "";
                const accumulatedToolCalls = [];
                const streamParser = new ThinkingStreamParser({
                    onThoughtChunk: (chunk) => {
                        callbacks.onThoughtChunk?.(chunk);
                    },
                    onContentChunk: (chunk) => {
                        roundContent += chunk;
                        totalContent += chunk;
                        callbacks.onContentChunk?.(chunk);
                    },
                });
                while (true) {
                    if (signal?.aborted) {
                        await reader.cancel().catch(() => { });
                        throw new Error("OPERATION_ABORTED");
                    }
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    lineBuffer += decoder.decode(value, { stream: true });
                    const lines = lineBuffer.split("\n");
                    lineBuffer = lines.pop() || "";
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) {
                            continue;
                        }
                        const dataStr = trimmed.slice(5).trim();
                        if (dataStr === "[DONE]") {
                            continue;
                        }
                        try {
                            const parsed = JSON.parse(dataStr);
                            const choice = parsed.choices?.[0];
                            if (!choice)
                                continue;
                            const delta = choice.delta || {};
                            // 协议级推理字段捕获 (如 DeepSeek API reasoning_content)
                            if (delta.reasoning_content) {
                                streamParser.feedReasoningDelta(delta.reasoning_content);
                            }
                            // 正文内容分块
                            if (delta.content) {
                                streamParser.feedContentDelta(delta.content);
                            }
                            // 工具调用片段累加 (严格按索引初始化，避免首包 name 重复拼接)
                            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                                for (const tc of delta.tool_calls) {
                                    const idx = tc.index ?? 0;
                                    if (!accumulatedToolCalls[idx]) {
                                        accumulatedToolCalls[idx] = {
                                            id: tc.id || `call_${Date.now()}_${idx}`,
                                            type: "function",
                                            function: {
                                                name: "",
                                                arguments: "",
                                            },
                                        };
                                    }
                                    if (tc.id) {
                                        accumulatedToolCalls[idx].id = tc.id;
                                    }
                                    if (tc.function?.name) {
                                        accumulatedToolCalls[idx].function.name += tc.function.name;
                                    }
                                    if (tc.function?.arguments) {
                                        accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                                    }
                                }
                            }
                        }
                        catch {
                            // 忽略单个 SSE 坏帧
                        }
                    }
                }
                // 排空流式分块缓冲
                streamParser.flush();
                // 4. 判断本轮是否触发了工具调用
                if (accumulatedToolCalls.length === 0) {
                    // 没有工具调用，生成完毕！
                    callbacks.onFinish?.(totalContent);
                    return totalContent;
                }
                // 模型发起了工具调用
                workingMessages.push({
                    role: "assistant",
                    content: roundContent || "",
                    tool_calls: accumulatedToolCalls,
                });
                // 5. 工具执行调度：若均为只读工具则并发执行以极速降低交互延迟，否则串行执行
                const READ_ONLY_TOOLS = new Set([
                    "search_diaries",
                    "locate_diary_content",
                    "read_diary_detail",
                    "get_diary_timeline_stats",
                    "get_recent_diaries",
                    "get_diaries_by_date",
                    "analyze_mood_trends",
                    "web_search",
                ]);
                const canExecuteParallel = accumulatedToolCalls.length > 1 &&
                    accumulatedToolCalls.every((tc) => READ_ONLY_TOOLS.has(tc.function.name.trim()));
                if (canExecuteParallel) {
                    // 并发调度所有只读工具
                    const toolPromises = accumulatedToolCalls.map(async (tc) => {
                        if (signal?.aborted) {
                            throw new Error("OPERATION_ABORTED");
                        }
                        const toolName = tc.function.name;
                        const argsStr = tc.function.arguments;
                        let parsedArgs = {};
                        try {
                            parsedArgs = JSON.parse(argsStr || "{}");
                        }
                        catch {
                            parsedArgs = { raw: argsStr };
                        }
                        callbacks.onToolCallStart?.({
                            id: tc.id,
                            name: toolName,
                            args: parsedArgs,
                        });
                        const toolResult = await ToolRegistry.executeTool(toolName, parsedArgs, {
                            userId: userContext.userId,
                            requestId,
                        });
                        callbacks.onToolCallResult?.({
                            id: tc.id,
                            name: toolName,
                            summary: toolResult.summary,
                            success: toolResult.success,
                            data: toolResult.data,
                        });
                        return { tc, toolResult };
                    });
                    const results = await Promise.all(toolPromises);
                    for (const { tc, toolResult } of results) {
                        let rawContent = JSON.stringify(toolResult.data !== undefined ? toolResult.data : toolResult);
                        // 上下文安全截断保护，防止超长内容击穿模型 Context
                        if (rawContent.length > 8000) {
                            rawContent =
                                rawContent.slice(0, 8000) +
                                    "...【系统提示：该工具返回数据较长，已安全截取前 8000 字符】";
                        }
                        workingMessages.push({
                            role: "tool",
                            tool_call_id: tc.id,
                            content: rawContent,
                        });
                    }
                }
                else {
                    // 串行执行各工具调用
                    for (const tc of accumulatedToolCalls) {
                        if (signal?.aborted) {
                            throw new Error("OPERATION_ABORTED");
                        }
                        const toolName = tc.function.name;
                        const argsStr = tc.function.arguments;
                        let parsedArgs = {};
                        try {
                            parsedArgs = JSON.parse(argsStr || "{}");
                        }
                        catch {
                            parsedArgs = { raw: argsStr };
                        }
                        // 通知上层工具调用开始
                        callbacks.onToolCallStart?.({
                            id: tc.id,
                            name: toolName,
                            args: parsedArgs,
                        });
                        // 执行工具
                        const toolResult = await ToolRegistry.executeTool(toolName, parsedArgs, {
                            userId: userContext.userId,
                            requestId,
                        });
                        // 通知上层工具调用结果
                        callbacks.onToolCallResult?.({
                            id: tc.id,
                            name: toolName,
                            summary: toolResult.summary,
                            success: toolResult.success,
                            data: toolResult.data,
                        });
                        let rawContent = JSON.stringify(toolResult.data !== undefined ? toolResult.data : toolResult);
                        // 上下文安全截断保护
                        if (rawContent.length > 8000) {
                            rawContent =
                                rawContent.slice(0, 8000) +
                                    "...【系统提示：该工具返回数据较长，已安全截取前 8000 字符】";
                        }
                        // 推入工作上下文
                        workingMessages.push({
                            role: "tool",
                            tool_call_id: tc.id,
                            content: rawContent,
                        });
                    }
                }
                // 自动循环进入下一轮 iteration
            }
            // 若超过最大轮次依然走到这里
            callbacks.onFinish?.(totalContent);
            return totalContent;
        }
        catch (err) {
            if (err.message === "OPERATION_ABORTED" || signal?.aborted) {
                // 主动中止
                return totalContent;
            }
            const errorObj = err instanceof Error ? err : new Error(tryCatchErrorToString(err));
            callbacks.onError?.(errorObj);
            throw errorObj;
        }
    }
}
export const agentEngine = new AgentEngine();
//# sourceMappingURL=agentEngine.js.map