import { describe, it, expect, vi } from "vitest";
import { ThinkingStreamParser } from "../core/agent/streamParser.js";
import { buildSystemPrompt } from "../core/agent/promptTemplates.js";
import { ToolRegistry } from "../core/agent/tools/index.js";
import { AgentEngine } from "../core/agent/agentEngine.js";

describe("Module 3: ThinkingStreamParser & CoT Tests", () => {
  it("should stream protocol-level reasoning_content to onThoughtChunk and content to onContentChunk", () => {
    const thoughts: string[] = [];
    const contents: string[] = [];

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
    const thoughts: string[] = [];
    const contents: string[] = [];

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
    const thoughts: string[] = [];
    const contents: string[] = [];

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
    const thoughts: string[] = [];
    const contents: string[] = [];

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
  it("should have web_search registered in ToolRegistry (total 8 tools)", () => {
    const tools = ToolRegistry.getOpenAiTools();
    expect(tools.length).toBe(8);

    const webTool = tools.find((t) => t.function.name === "web_search");
    expect(webTool).toBeDefined();
    expect(webTool?.function.parameters.properties.query).toBeDefined();
    expect(webTool?.function.parameters.required).toContain("query");
  });

  it("should reject web_search when query is empty", async () => {
    const result = await ToolRegistry.executeTool(
      "web_search",
      { query: "" },
      { userId: "user-1", requestId: "req-1" }
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("不能为空");
  });

  it("should gracefully handle external web search errors without throwing", async () => {
    const result = await ToolRegistry.executeTool(
      "web_search",
      { query: "Node.js release schedule 2026" },
      { userId: "user-1", requestId: "req-1" }
    );
    // 即使外网受限也应该平滑降级，success 为 true 且包含 notice 或 results
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
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

    await expect(
      engine.execute({
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
      })
    ).resolves.toBe("");
  });
});
