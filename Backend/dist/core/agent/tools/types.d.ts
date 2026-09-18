/**
 * OpenAI 格式的 JSON Schema 属性定义
 */
export interface JsonSchemaProperty {
    type: "string" | "number" | "integer" | "boolean" | "array" | "object";
    description: string;
    enum?: string[];
    items?: JsonSchemaProperty;
}
/**
 * 符合 OpenAI Tool 格式的定义
 */
export interface AgentToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, JsonSchemaProperty>;
            required?: string[];
        };
    };
}
/**
 * 工具执行上下文 (强制绑定当前安全认证用户与请求上下文)
 */
export interface AgentToolContext {
    userId: string;
    requestId: string;
    withdrawStack?: Array<() => Promise<void>>;
}
/**
 * 工具执行标准响应体
 */
export interface AgentToolResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    summary: string;
}
/**
 * 单个工具执行器函数签名
 */
export type AgentToolExecutor = (args: any, context: AgentToolContext) => Promise<AgentToolResult>;
//# sourceMappingURL=types.d.ts.map