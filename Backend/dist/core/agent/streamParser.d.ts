/**
 * 思维链分流状态机 (Thinking Stream Parser)
 * 职责：
 * 1. 拦截并分流协议级推理字段 (delta.reasoning_content -> thought)
 * 2. 拦截并剥离文本级 <think>...</think> 标签 (杜绝标签泄漏，将内部思考流式推给 thought，闭合后推给 content)
 * 3. 滑动窗口防止标签跨分块切断
 */
export type StreamMode = "CHECKING" | "THINKING" | "CONTENT";
export interface StreamParserCallbacks {
    onThoughtChunk: (chunk: string) => void;
    onContentChunk: (chunk: string) => void;
}
export declare class ThinkingStreamParser {
    private mode;
    private buffer;
    private hasProtocolReasoning;
    private onThoughtChunk;
    private onContentChunk;
    constructor(callbacks: StreamParserCallbacks);
    /**
     * 注入协议级原生推理字段 (如 DeepSeek API / vLLM 的 delta.reasoning_content)
     */
    feedReasoningDelta(delta: string): void;
    /**
     * 注入正文增量分块 (delta.content)，负责探测并剥离 <think> 标签
     */
    feedContentDelta(delta: string): void;
    /**
     * 流结束时排空剩余缓冲
     */
    flush(): void;
    /**
     * 获取当前状态机模式
     */
    getMode(): StreamMode;
}
//# sourceMappingURL=streamParser.d.ts.map