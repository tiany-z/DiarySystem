export interface AgentChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    name?: string;
    tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
    }>;
    tool_call_id?: string;
}
export interface AgentExecutionOptions {
    userConfig: {
        baseUrl: string;
        apiKey: string;
        modelName: string;
    };
    userContext: {
        userId: string;
        username: string;
        nickname?: string;
    };
    messages: AgentChatMessage[];
    signal?: AbortSignal;
    callbacks: {
        onThoughtChunk?: (chunk: string) => void;
        onContentChunk?: (chunk: string) => void;
        onToolCallStart?: (toolCall: {
            id: string;
            name: string;
            args: any;
        }) => void;
        onToolCallResult?: (toolResult: {
            id: string;
            name: string;
            summary: string;
            success: boolean;
            data?: any;
        }) => void;
        onFinish?: (finalContent: string) => void;
        onError?: (error: Error) => void;
    };
}
/**
 * 规范化 Base URL，确保兼容各类 OpenAI 规范接口
 */
export declare function normalizeCompletionsUrl(baseUrl: string): string;
/**
 * AI Agent ReAct 自主思考与多轮工具循环决策引擎
 */
export declare class AgentEngine {
    static readonly MAX_ITERATIONS = 6;
    /**
     * 执行完整的 ReAct 决策循环
     */
    execute(options: AgentExecutionOptions): Promise<string>;
}
export declare const agentEngine: AgentEngine;
//# sourceMappingURL=agentEngine.d.ts.map