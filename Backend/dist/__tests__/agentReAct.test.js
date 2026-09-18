import { describe, it, expect } from "vitest";
import { ThinkingStreamParser } from "../core/agent/streamParser.js";
import { buildSystemPrompt } from "../core/agent/promptTemplates.js";
import { ToolRegistry } from "../core/agent/tools/index.js";
import { AgentEngine } from "../core/agent/agentEngine.js";
describe("Module 3: ThinkingStreamParser & CoT Tests", () => {
    it("should stream protocol-level reasoning_content to onThoughtChunk and content to onContentChunk", () => {
        const thoughts = [];
        const contents = [];
        const parser = new ThinkingStreamParser({
            onThoughtChunk: (chunk) => thoughts.push(chunk),
            onContentChunk: (chunk) => contents.push(chunk),
        });
        parser.feedReasoningDelta("I should check");
        parser.feedReasoningDelta(" the diaries first.");
        parser.feedContentDelta("Hello! Here is the summary.");
        parser.flush();
        expect(thoughts.join("")).toBe("I should check the diaries first.");
        expect(contents.join("")).toBe("Hello! Here is the summary.");
    });
    it("should strip <think>...</think> tags and separate thoughts from contents", () => {
        const thoughts = [];
        const contents = [];
        const parser = new ThinkingStreamParser({
            onThoughtChunk: (chunk) => thoughts.push(chunk),
            onContentChunk: (chunk) => contents.push(chunk),
        });
        // 模拟包含 <think> 标签的流
        parser.feedContentDelta("<think>\nAnalyzing user request...\nUser wants to know about mood.\n</think>\nBased on your records, you were happy!");
        parser.flush();
        expect(thoughts.join("")).toContain("Analyzing user request");
        expect(thoughts.join("")).toContain("User wants to know about mood.");
        expect(thoughts.join("")).not.toContain("<think>");
        expect(thoughts.join("")).not.toContain("</think>");
        expect(contents.join("")).toBe("Based on your records, you were happy!");
        expect(contents.join("")).not.toContain("<think>");
        expect(contents.join("")).not.toContain("</think>");
    });
    it("should handle chunks where <think> and </think> are split across multiple chunks", () => {
        const thoughts = [];
        const contents = [];
        const parser = new ThinkingStreamParser({
            onThoughtChunk: (chunk) => thoughts.push(chunk),
            onContentChunk: (chunk) => contents.push(chunk),
        });
        // <think> 标签跨分块
        parser.feedContentDelta("<th");
        parser.feedContentDelta("ink>");
        parser.feedContentDelta("Step 1: thinking... ");
        parser.feedContentDelta("Step 2: verifying... ");
        // </think> 标签跨分块
        parser.feedContentDelta("</th");
        parser.feedContentDelta("ink>\nFinal ");
        parser.feedContentDelta("Answer!");
        parser.flush();
        const fullThought = thoughts.join("");
        const fullContent = contents.join("");
        expect(fullThought).toContain("Step 1: thinking...");
        expect(fullThought).toContain("Step 2: verifying...");
        expect(fullThought).not.toContain("<think>");
        expect(fullThought).not.toContain("</think>");
        expect(fullContent).toBe("Final Answer!");
    });
    it("should directly emit content when no think tag is present", () => {
        const thoughts = [];
        const contents = [];
        const parser = new ThinkingStreamParser({
            onThoughtChunk: (chunk) => thoughts.push(chunk),
            onContentChunk: (chunk) => contents.push(chunk),
        });
        parser.feedContentDelta("Just a normal response without any thinking tags.");
        parser.flush();
        expect(thoughts.length).toBe(0);
        expect(contents.join("")).toBe("Just a normal response without any thinking tags.");
    });
});
describe("Module 3: PromptTemplates Tests", () => {
    it("should generate system prompt with current date and user info", () => {
        const prompt = buildSystemPrompt({
            username: "tiany",
            nickname: "田同学",
        });
        expect(prompt).toContain("拾光手记 AI 助手");
        expect(prompt).toContain("田同学 (@tiany)");
        expect(prompt).toContain("当前现实标准时间：");
        expect(prompt).toContain("search_diaries");
        expect(prompt).toContain("web_search");
        expect(prompt).toContain("delete_diary");
        expect(prompt).toContain("confirmed: true");
    });
});
describe("Module 3: WebSearchTool & Registry Tests", () => {
    it("should have web_search registered in ToolRegistry (total 11 tools)", () => {
        const tools = ToolRegistry.getOpenAiTools();
        expect(tools.length).toBe(11);
        const webTool = tools.find((t) => t.function.name === "web_search");
        expect(webTool).toBeDefined();
        expect(webTool?.function.parameters.properties.query).toBeDefined();
        expect(webTool?.function.parameters.required).toContain("query");
    });
    it("should reject web_search when query is empty", async () => {
        const result = await ToolRegistry.executeTool("web_search", { query: "" }, { userId: "user-1", requestId: "req-1" });
        expect(result.success).toBe(false);
        expect(result.error).toContain("不能为空");
    });
    it("should gracefully handle external web search errors without throwing", async () => {
        // 即使网络异常或被封锁，也应返回结构化降级信息而非抛出未捕获异常
        const result = await ToolRegistry.executeTool("web_search", { query: "arbitrary search query test" }, { userId: "user-1", requestId: "req-1" });
        expect(result.summary).toBeDefined();
        expect(typeof result.success).toBe("boolean");
    });
    it("should correctly accumulate tool calls across chunks without duplicating function name", () => {
        const chunks = [
            {
                delta: {
                    tool_calls: [
                        {
                            index: 0,
                            id: "call_test_123",
                            type: "function",
                            function: { name: "get_diary_timeline_stats", arguments: "" },
                        },
                    ],
                },
            },
            {
                delta: {
                    tool_calls: [
                        {
                            index: 0,
                            function: { arguments: '{"time' },
                        },
                    ],
                },
            },
            {
                delta: {
                    tool_calls: [
                        {
                            index: 0,
                            function: { arguments: 'Range":"all"}' },
                        },
                    ],
                },
            },
        ];
        const accumulatedToolCalls = [];
        for (const chunk of chunks) {
            if (chunk.delta.tool_calls) {
                for (const tc of chunk.delta.tool_calls) {
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
        expect(accumulatedToolCalls.length).toBe(1);
        expect(accumulatedToolCalls[0].function.name).toBe("get_diary_timeline_stats");
        expect(accumulatedToolCalls[0].function.arguments).toBe('{"timeRange":"all"}');
        expect(ToolRegistry.hasTool(accumulatedToolCalls[0].function.name)).toBe(true);
    });
});
describe("Module 3: AgentEngine ReAct Loop Structure", () => {
    it("should enforce maximum iterations limit of 6", () => {
        expect(AgentEngine.MAX_ITERATIONS).toBe(6);
    });
    it("should handle AbortSignal gracefully without hanging", async () => {
        const engine = new AgentEngine();
        const controller = new AbortController();
        controller.abort(); // 立即中止
        await expect(engine.execute({
            userConfig: {
                baseUrl: "https://api.openai.com/v1",
                apiKey: "sk-mock",
                modelName: "gpt-4o",
            },
            userContext: {
                userId: "user-1",
                username: "test",
            },
            messages: [{ role: "user", content: "Hello" }],
            signal: controller.signal,
            callbacks: {},
        })).resolves.toBe("");
    });
});
//# sourceMappingURL=agentReAct.test.js.map