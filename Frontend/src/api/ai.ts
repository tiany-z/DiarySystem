import { apiClient, ApiResponse } from "./client";

export interface UserAiConfig {
  baseUrl: string;
  modelName: string;
  hasKey: boolean;
  maskedKey: string;
}

export interface TestAiConfigResult {
  success: boolean;
  latencyMs?: number;
  model?: string;
  message: string;
}

/**
 * 获取当前用户的 AI 引擎配置 (API Key 脱敏)
 */
export async function getAiConfig(): Promise<ApiResponse<UserAiConfig>> {
  return apiClient.get<UserAiConfig>("/api/user/ai-config");
}

/**
 * 保存或更新当前用户的 AI 引擎配置
 */
export async function saveAiConfig(data: {
  baseUrl: string;
  modelName: string;
  apiKey?: string;
}): Promise<ApiResponse<UserAiConfig>> {
  return apiClient.post<UserAiConfig>("/api/user/ai-config", data);
}

/**
 * 实时测试 AI 引擎端点连通性探针
 */
export async function testAiConfig(data: {
  baseUrl: string;
  modelName: string;
  apiKey?: string;
}): Promise<ApiResponse<TestAiConfigResult>> {
  return apiClient.post<TestAiConfigResult>("/api/user/ai-config/test", data);
}

// =========================================================================
// AI 会话与消息持久化接口
// =========================================================================

export interface AiConversation {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessageItem {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  thought?: string | null;
  toolCalls?: Array<{
    id: string;
    name?: string;
    tool?: string;
    args?: any;
    summary?: string;
    status?: "running" | "success" | "failed";
  }> | null;
  toolCallId?: string | null;
  createdAt: string;
}

export interface AiMessagesResponse {
  conversationId: string;
  title: string;
  total: number;
  messages: AiMessageItem[];
}

/**
 * 获取会话列表
 */
export async function getAiConversations(
  keyword?: string
): Promise<ApiResponse<AiConversation[]>> {
  return apiClient.get<AiConversation[]>("/api/ai/conversations", { keyword });
}

/**
 * 新建空白会话
 */
export async function createAiConversation(
  title?: string
): Promise<ApiResponse<AiConversation>> {
  return apiClient.post<AiConversation>("/api/ai/conversations", { title });
}

/**
 * 修改会话 (重命名或切换置顶)
 */
export async function updateAiConversation(
  id: string,
  updates: { title?: string; isPinned?: boolean }
): Promise<ApiResponse<any>> {
  return apiClient.put("/api/ai/conversations", { id, ...updates });
}

/**
 * 软删除会话
 */
export async function deleteAiConversation(id: string): Promise<ApiResponse<any>> {
  return apiClient.delete("/api/ai/conversations", { id });
}

/**
 * 获取指定会话的消息历史
 */
export async function getAiMessages(
  conversationId: string,
  limit: number = 50
): Promise<ApiResponse<AiMessagesResponse>> {
  return apiClient.get<AiMessagesResponse>("/api/ai/messages", {
    conversationId,
    limit,
  });
}

// =========================================================================
// 原生 fetch + SSE 流式客户端
// =========================================================================

export interface ChatStreamCallbacks {
  onConversation?: (conv: { conversationId: string; title: string }) => void;
  onThought?: (delta: string) => void;
  onToolCall?: (toolCall: { id?: string; tool: string; args: any }) => void;
  onToolResult?: (toolResult: {
    id?: string;
    tool: string;
    summary: string;
    success?: boolean;
    data?: any;
  }) => void;
  onChunk?: (delta: string) => void;
  onFinish?: (data: { messageId: string; conversationId: string; aborted?: boolean }) => void;
  onError?: (err: Error) => void;
}

/**
 * 基于原生 fetch 与 ReadableStream 的 SSE 对话客户端
 */
export async function sendChatStream(
  body: { conversationId?: string; message: string },
  callbacks: ChatStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem("diary_token");
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.content || `请求异常 HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法创建响应流读取器");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const block of parts) {
      const trimmed = block.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;

      const eventMatch = trimmed.match(/^event:\s*([a-zA-Z0-9_-]+)/m);
      const dataMatch = trimmed.match(/^data:\s*(.+)$/m);

      const eventName = eventMatch ? eventMatch[1] : "chunk";
      const rawData = dataMatch ? dataMatch[1] : "";

      let parsedData: any = rawData;
      try {
        parsedData = JSON.parse(rawData);
      } catch {
        parsedData = rawData;
      }

      switch (eventName) {
        case "conversation":
          callbacks.onConversation?.(parsedData);
          break;
        case "thought":
          callbacks.onThought?.(parsedData?.delta ?? parsedData);
          break;
        case "tool_call":
          callbacks.onToolCall?.(parsedData);
          break;
        case "tool_result":
          callbacks.onToolResult?.(parsedData);
          break;
        case "chunk":
          callbacks.onChunk?.(parsedData?.delta ?? parsedData);
          break;
        case "finish":
          callbacks.onFinish?.(parsedData);
          break;
        case "error":
          callbacks.onError?.(
            new Error(parsedData?.error || "AI 对话接口异常")
          );
          break;
      }
    }
  }
}
