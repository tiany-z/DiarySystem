import { diaryTools, diaryExecutors } from "./diaryTools.js";
import { webSearchTool, webSearchExecutor } from "./webSearchTool.js";
/**
 * AI Agent 工具注册与调度中枢
 */
export class AgentToolRegistry {
    definitions = new Map();
    executors = new Map();
    constructor() {
        this.registerDefaults();
    }
    registerDefaults() {
        // 注册日记原生 7 大工具
        for (const def of diaryTools) {
            this.definitions.set(def.function.name, def);
        }
        for (const [name, fn] of Object.entries(diaryExecutors)) {
            this.executors.set(name, fn);
        }
        // 注册实时网络搜索工具
        this.definitions.set(webSearchTool.function.name, webSearchTool);
        this.executors.set(webSearchTool.function.name, webSearchExecutor);
    }
    /**
     * 动态注册或覆盖工具 (例如后续注入 web_search)
     */
    registerTool(def, executor) {
        this.definitions.set(def.function.name, def);
        this.executors.set(def.function.name, executor);
    }
    /**
     * 导出供 OpenAI Chat Completions 接口使用的 tools 数组
     */
    getOpenAiTools() {
        return Array.from(this.definitions.values());
    }
    /**
     * 规范化工具名称 (去除前后空格、兼容 camelCase 与 snake_case)
     */
    normalizeToolName(name) {
        const trimmed = (name || "").trim();
        if (this.executors.has(trimmed)) {
            return trimmed;
        }
        // 兼容 camelCase 转 snake_case (如 searchDiaries -> search_diaries)
        const snakeCase = trimmed
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .toLowerCase();
        if (this.executors.has(snakeCase)) {
            return snakeCase;
        }
        return trimmed;
    }
    /**
     * 检查指定工具是否存在
     */
    hasTool(toolName) {
        const normalized = this.normalizeToolName(toolName);
        return this.executors.has(normalized);
    }
    /**
     * 分发并执行工具调用
     */
    async executeTool(toolName, argsStringOrObj, context) {
        const normalized = this.normalizeToolName(toolName);
        const executor = this.executors.get(normalized);
        if (!executor) {
            return {
                success: false,
                error: `未知工具调用: [${toolName}]`,
                summary: `工具 [${toolName}] 不存在`,
            };
        }
        let parsedArgs = {};
        if (typeof argsStringOrObj === "string") {
            try {
                parsedArgs = JSON.parse(argsStringOrObj);
            }
            catch (err) {
                return {
                    success: false,
                    error: `工具入参 JSON 解析失败: ${err?.message || String(err)}`,
                    summary: "参数解析异常",
                };
            }
        }
        else {
            parsedArgs = argsStringOrObj || {};
        }
        try {
            return await executor(parsedArgs, context);
        }
        catch (err) {
            return {
                success: false,
                error: `工具执行异常: ${err?.message || String(err)}`,
                summary: `执行 [${toolName}] 失败`,
            };
        }
    }
}
export const ToolRegistry = new AgentToolRegistry();
export * from "./types.js";
export * from "./diaryTools.js";
export * from "./webSearchTool.js";
//# sourceMappingURL=index.js.map