import { AgentToolDefinition, AgentToolExecutor, AgentToolResult, AgentToolContext } from "./types.js";
/**
 * AI Agent 工具注册与调度中枢
 */
export declare class AgentToolRegistry {
    private definitions;
    private executors;
    constructor();
    private registerDefaults;
    /**
     * 动态注册或覆盖工具 (例如后续注入 web_search)
     */
    registerTool(def: AgentToolDefinition, executor: AgentToolExecutor): void;
    /**
     * 导出供 OpenAI Chat Completions 接口使用的 tools 数组
     */
    getOpenAiTools(): AgentToolDefinition[];
    /**
     * 规范化工具名称 (去除前后空格、兼容 camelCase 与 snake_case)
     */
    normalizeToolName(name: string): string;
    /**
     * 检查指定工具是否存在
     */
    hasTool(toolName: string): boolean;
    /**
     * 分发并执行工具调用
     */
    executeTool(toolName: string, argsStringOrObj: string | any, context: AgentToolContext): Promise<AgentToolResult>;
}
export declare const ToolRegistry: AgentToolRegistry;
export * from "./types.js";
export * from "./diaryTools.js";
export * from "./webSearchTool.js";
//# sourceMappingURL=index.d.ts.map