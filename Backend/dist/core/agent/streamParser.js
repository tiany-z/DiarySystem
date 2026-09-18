/**
 * 思维链分流状态机 (Thinking Stream Parser)
 * 职责：
 * 1. 拦截并分流协议级推理字段 (delta.reasoning_content -> thought)
 * 2. 拦截并剥离文本级 <think>...</think> 标签 (杜绝标签泄漏，将内部思考流式推给 thought，闭合后推给 content)
 * 3. 滑动窗口防止标签跨分块切断
 */
export class ThinkingStreamParser {
    mode = "CHECKING";
    buffer = "";
    hasProtocolReasoning = false;
    onThoughtChunk;
    onContentChunk;
    constructor(callbacks) {
        this.onThoughtChunk = callbacks.onThoughtChunk;
        this.onContentChunk = callbacks.onContentChunk;
    }
    /**
     * 注入协议级原生推理字段 (如 DeepSeek API / vLLM 的 delta.reasoning_content)
     */
    feedReasoningDelta(delta) {
        if (!delta)
            return;
        this.hasProtocolReasoning = true;
        this.onThoughtChunk(delta);
    }
    /**
     * 注入正文增量分块 (delta.content)，负责探测并剥离 <think> 标签
     */
    feedContentDelta(delta) {
        if (!delta)
            return;
        // 如果此前已经收到了协议级推理字段，说明该模型走的是原生协议通道，正文不可能是 <think> 标签包围
        if (this.hasProtocolReasoning) {
            this.mode = "CONTENT";
            this.onContentChunk(delta);
            return;
        }
        if (this.mode === "CONTENT") {
            this.onContentChunk(delta);
            return;
        }
        this.buffer += delta;
        if (this.mode === "CHECKING") {
            const trimmed = this.buffer.trimStart();
            const trimmedLower = trimmed.toLowerCase();
            // 正在缓冲可能是 <think> 开头的前缀 (大小写不敏感)
            if ("<think>".startsWith(trimmedLower)) {
                if (trimmedLower === "<think>") {
                    this.mode = "THINKING";
                    this.buffer = "";
                }
                return;
            }
            // 如果缓冲区内已经完整包含了 <think> (大小写不敏感)
            const lowerBuffer = this.buffer.toLowerCase();
            const thinkIdx = lowerBuffer.indexOf("<think>");
            if (thinkIdx !== -1) {
                const prefix = this.buffer.slice(0, thinkIdx);
                if (prefix) {
                    this.onContentChunk(prefix);
                }
                this.mode = "THINKING";
                this.buffer = this.buffer.slice(thinkIdx + 7);
                // 继续流转到 THINKING 逻辑处理
            }
            else {
                // 如果累积长度已经超过了 <think> 且不是其前缀，判定为纯正文
                if (trimmed.length > 7 || (!"<think>".startsWith(trimmedLower) && trimmed.length > 0)) {
                    this.mode = "CONTENT";
                    this.onContentChunk(this.buffer);
                    this.buffer = "";
                    return;
                }
            }
        }
        if (this.mode === "THINKING") {
            const lowerBuffer = this.buffer.toLowerCase();
            const closeIdx = lowerBuffer.indexOf("</think>");
            if (closeIdx !== -1) {
                const thoughtText = this.buffer.slice(0, closeIdx);
                const remaining = this.buffer.slice(closeIdx + 8);
                if (thoughtText) {
                    this.onThoughtChunk(thoughtText);
                }
                this.mode = "CONTENT";
                this.buffer = "";
                if (remaining) {
                    // 清除多余的首尾空行后作为正式正文推送
                    const cleanRemaining = remaining.replace(/^\s+/, "");
                    if (cleanRemaining) {
                        this.onContentChunk(cleanRemaining);
                    }
                }
            }
            else {
                // 预留最后 8 个字符防范 </think> 被跨分块截断
                if (this.buffer.length > 8) {
                    const emitLength = this.buffer.length - 8;
                    const toEmit = this.buffer.slice(0, emitLength);
                    this.buffer = this.buffer.slice(emitLength);
                    this.onThoughtChunk(toEmit);
                }
            }
        }
    }
    /**
     * 流结束时排空剩余缓冲
     */
    flush() {
        if (this.buffer) {
            if (this.mode === "THINKING") {
                const lowerBuffer = this.buffer.toLowerCase();
                const closeIdx = lowerBuffer.indexOf("</think>");
                if (closeIdx !== -1) {
                    const thoughtText = this.buffer.slice(0, closeIdx);
                    const remaining = this.buffer.slice(closeIdx + 8).replace(/^\s+/, "");
                    if (thoughtText)
                        this.onThoughtChunk(thoughtText);
                    if (remaining)
                        this.onContentChunk(remaining);
                }
                else {
                    this.onThoughtChunk(this.buffer);
                }
            }
            else {
                this.onContentChunk(this.buffer);
            }
            this.buffer = "";
        }
    }
    /**
     * 获取当前状态机模式
     */
    getMode() {
        return this.mode;
    }
}
//# sourceMappingURL=streamParser.js.map