import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../core/agent/tools/index.js";

describe("Agent Tools & Registry Test Suite", () => {
  it("should register all 7 default diary tools and web_search", () => {
    const tools = ToolRegistry.getOpenAiTools();
    expect(tools.length).toBe(8);

    const toolNames = tools.map((t) => t.function.name);
    expect(toolNames).toContain("search_diaries");
    expect(toolNames).toContain("locate_diary_content");
    expect(toolNames).toContain("read_diary_detail");
    expect(toolNames).toContain("get_diary_timeline_stats");
    expect(toolNames).toContain("create_diary");
    expect(toolNames).toContain("update_diary");
    expect(toolNames).toContain("delete_diary");
    expect(toolNames).toContain("web_search");
  });

  it("should have correct OpenAI-compatible tool schemas", () => {
    const tools = ToolRegistry.getOpenAiTools();
    for (const tool of tools) {
      expect(tool.type).toBe("function");
      expect(tool.function).toBeDefined();
      expect(typeof tool.function.name).toBe("string");
      expect(typeof tool.function.description).toBe("string");
      expect(tool.function.parameters).toBeDefined();
      expect(tool.function.parameters.type).toBe("object");
      expect(tool.function.parameters.properties).toBeDefined();
    }
  });

  it("should handle unknown tool execution gracefully", async () => {
    const res = await ToolRegistry.executeTool("non_existent_tool", {}, {
      userId: "user-123",
      requestId: "req-1",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("未知工具调用");
    expect(res.summary).toContain("不存在");
  });

  it("should handle malformed JSON string arguments gracefully", async () => {
    const res = await ToolRegistry.executeTool("search_diaries", "{ bad json", {
      userId: "user-123",
      requestId: "req-1",
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("解析失败");
  });

  it("should reject delete_diary if confirmed is not true", async () => {
    const res = await ToolRegistry.executeTool(
      "delete_diary",
      { diaryId: "d-123", confirmed: false },
      { userId: "user-123", requestId: "req-1" }
    );
    expect(res.success).toBe(false);
    expect(res.error).toBe("SAFETY_CONFIRMATION_REQUIRED");
    expect(res.summary).toContain("二次确认");
  });

  it("should allow dynamic tool registration", async () => {
    ToolRegistry.registerTool(
      {
        type: "function",
        function: {
          name: "mock_test_tool",
          description: "Mock test tool",
          parameters: {
            type: "object",
            properties: {
              msg: { type: "string", description: "Test message" },
            },
          },
        },
      },
      async (args) => {
        return {
          success: true,
          data: { echo: args.msg },
          summary: `Echoed: ${args.msg}`,
        };
      }
    );

    expect(ToolRegistry.hasTool("mock_test_tool")).toBe(true);

    const result = await ToolRegistry.executeTool(
      "mock_test_tool",
      JSON.stringify({ msg: "hello" }),
      { userId: "user-1", requestId: "req-1" }
    );
    expect(result.success).toBe(true);
    expect(result.data.echo).toBe("hello");
  });
});
