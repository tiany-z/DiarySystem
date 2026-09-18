import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PanelLeft20Regular,
  Add20Regular,
  Settings20Regular,
  Dismiss20Regular,
} from "@fluentui/react-icons";
import {
  AiConversation,
  AiMessageItem,
  getAiConfig,
  getAiConversations,
  getAiMessages,
  createAiConversation,
  updateAiConversation,
  deleteAiConversation,
  sendChatStream,
  UserAiConfig,
} from "../../api/ai";
import { ConversationSidebar } from "../../components/ai/ConversationSidebar";
import { ChatMessageList } from "../../components/ai/ChatMessageList";
import { ChatInputArea } from "../../components/ai/ChatInputArea";
import { AiSettingsModal } from "../../components/AiSettingsModal";

export const AIChatView: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  // 状态管理
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<AiMessageItem[]>([]);
  const [aiConfig, setAiConfig] = useState<UserAiConfig | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 流式输出临时状态
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamingMessage, setStreamingMessage] = useState<{
    content: string;
    thought?: string;
    toolCalls?: any[];
  } | null>(null);

  // 移动端响应式与抽屉状态
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentActiveConvIdRef = useRef<string | null>(activeId);

  // 监听窗口宽度变动
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. 初始化拉取用户 AI 配置
  const fetchConfig = useCallback(async () => {
    try {
      const res = await getAiConfig();
      if (res.status === 1 && res.data) {
        setAiConfig(res.data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // 2. 拉取会话列表
  const fetchConversations = useCallback(async () => {
    try {
      const res = await getAiConversations();
      if (res.status === 1 && res.data) {
        setConversations(res.data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 3. 路由变化时同步 activeId 并加载该会话消息
  useEffect(() => {
    if (conversationId) {
      // 若变动的路由正好是当前已处于活跃交互态的同一会话（例如首条消息发送时就地 replace URL），
      // 避免重复触发空/半拉取覆盖内存中正在流式生成的对话上下文
      if (
        currentActiveConvIdRef.current === conversationId &&
        (messages.length > 0 || isStreaming)
      ) {
        return;
      }
      currentActiveConvIdRef.current = conversationId;
      setActiveId(conversationId);
      getAiMessages(conversationId).then((res) => {
        if (res.status === 1 && res.data?.messages) {
          setMessages(res.data.messages);
        }
      });
    } else {
      currentActiveConvIdRef.current = null;
      setActiveId(null);
      setMessages([]);
    }
  }, [conversationId]);

  // 终止生成
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage(null);
  }, []);

  // 组件卸载时自动中止当前生成，防止内存泄漏
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // 新建会话
  const handleNewChat = () => {
    handleStopGeneration();
    currentActiveConvIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    navigate("/workspace/ai");
    setIsSidebarOpen(false);
  };

  // 切换会话
  const handleSelectConversation = (id: string) => {
    if (id === activeId) return;
    handleStopGeneration();
    currentActiveConvIdRef.current = id;
    setActiveId(id);
    navigate(`/workspace/ai/${id}`);
    setIsSidebarOpen(false);
  };

  // 重命名会话
  const handleRename = async (id: string, newTitle: string) => {
    const res = await updateAiConversation(id, { title: newTitle });
    if (res.status === 1) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    }
  };

  // 置顶切换
  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const res = await updateAiConversation(id, { isPinned });
    if (res.status === 1) {
      fetchConversations();
    }
  };

  // 删除会话
  const handleDelete = async (id: string) => {
    const res = await deleteAiConversation(id);
    if (res.status === 1) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        handleNewChat();
      }
    }
  };

  // 发送消息核心方法
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    if (!aiConfig?.hasKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userMsg: AiMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const streamState = {
      content: "",
      thought: "",
      toolCalls: [] as any[],
    };
    setStreamingMessage(streamState);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let targetConvId = activeId || undefined;

    try {
      await sendChatStream(
        {
          conversationId: targetConvId,
          message: userText,
        },
        {
          onConversation: (conv) => {
            currentActiveConvIdRef.current = conv.conversationId;
            setActiveId(conv.conversationId);
            targetConvId = conv.conversationId;

            // 侧栏立即 0 延迟呈现新会话
            setConversations((prev) => {
              if (prev.some((c) => c.id === conv.conversationId)) return prev;
              return [
                {
                  id: conv.conversationId,
                  title: conv.title,
                  isPinned: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                ...prev,
              ];
            });

            navigate(`/workspace/ai/${conv.conversationId}`, { replace: true });
          },
          onThought: (delta) => {
            streamState.thought += delta;
            setStreamingMessage({ ...streamState });
          },
          onToolCall: (tc) => {
            streamState.toolCalls.push({
              id: tc.id || `tc-${Date.now()}-${streamState.toolCalls.length}`,
              tool: tc.tool,
              args: tc.args,
              status: "running",
            });
            setStreamingMessage({ ...streamState });
          },
          onToolResult: (tr) => {
            const idx = streamState.toolCalls.findIndex(
              (t) => t.id === tr.id || t.tool === tr.tool
            );
            if (idx >= 0) {
              streamState.toolCalls[idx].summary = tr.summary;
              streamState.toolCalls[idx].status = tr.success ? "success" : "failed";
              streamState.toolCalls[idx].data = tr.data;
            }
            setStreamingMessage({ ...streamState });
          },
          onChunk: (delta) => {
            streamState.content += delta;
            setStreamingMessage({ ...streamState });
          },
          onFinish: (data) => {
            const assistantMsg: AiMessageItem = {
              id: data.messageId || `msg-${Date.now()}`,
              role: "assistant",
              content: streamState.content,
              thought: streamState.thought || null,
              toolCalls: streamState.toolCalls.length > 0 ? streamState.toolCalls : null,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingMessage(null);
            setIsStreaming(false);
            fetchConversations();
          },
          onError: (err) => {
            const errorMsg: AiMessageItem = {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: `⚠️ 生成异常: ${err.message}`,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            setStreamingMessage(null);
            setIsStreaming(false);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        // 用户主动停止生成
        if (streamState.content || streamState.thought) {
          const partialMsg: AiMessageItem = {
            id: `partial-${Date.now()}`,
            role: "assistant",
            content: streamState.content + "\n\n*(已停止生成)*",
            thought: streamState.thought || null,
            toolCalls: streamState.toolCalls.length > 0 ? streamState.toolCalls : null,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, partialMsg]);
        }
      } else {
        const errorMsg: AiMessageItem = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ 网络或服务异常: ${err.message}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
      setStreamingMessage(null);
      setIsStreaming(false);
    }
  };

  const currentTitle =
    conversations.find((c) => c.id === activeId)?.title || "新对话";

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - var(--header-height, 64px))",
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 1. PC 端左侧亚克力侧边栏 (280px) */}
      {!isMobile && (
        <div style={{ width: "280px", height: "100%", flexShrink: 0 }}>
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onRenameConversation={handleRename}
            onTogglePin={handleTogglePin}
            onDeleteConversation={handleDelete}
          />
        </div>
      )}

      {/* 2. 移动端抽屉侧边栏 */}
      {isMobile && isSidebarOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: "flex",
          }}
        >
          {/* 半透明遮罩 */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* 抽屉内容区 */}
          <div
            style={{
              position: "relative",
              width: "280px",
              height: "100%",
              backgroundColor: "#ffffff",
              boxShadow: "4px 0 24px rgba(0, 0, 0, 0.2)",
              zIndex: 1001,
            }}
          >
            <ConversationSidebar
              conversations={conversations}
              activeId={activeId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onRenameConversation={handleRename}
              onTogglePin={handleTogglePin}
              onDeleteConversation={handleDelete}
              onCloseMobile={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. 右侧对话中枢视窗 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          position: "relative",
          minWidth: 0,
        }}
      >
        {/* 对话顶栏 */}
        <div
          style={{
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
            backgroundColor: "rgba(255, 255, 255, 0.45)",
            backdropFilter: "blur(16px)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="会话列表"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  color: "#4a5568",
                }}
              >
                <PanelLeft20Regular style={{ fontSize: "20px" }} />
              </button>
            )}

            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#2d3748",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeId ? currentTitle : "AI 助手"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {activeId && (
              <button
                onClick={handleNewChat}
                title="新对话"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: "#5B7B8D",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                <Add20Regular style={{ fontSize: "16px" }} />
                新对话
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="设置"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                color: "#718096",
              }}
            >
              <Settings20Regular style={{ fontSize: "18px" }} />
            </button>
          </div>
        </div>

        {/* 消息历史滚动区 */}
        <ChatMessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isStreaming={isStreaming}
          onSelectPrompt={handleSendMessage}
        />

        {/* 底部悬浮输入中枢 */}
        <ChatInputArea
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isStreaming={isStreaming}
          modelName={aiConfig?.modelName}
          hasConfig={Boolean(aiConfig?.hasKey)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* 用户私有 AI 模型参数设置模态框 */}
      <AiSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={fetchConfig}
      />
    </div>
  );
};
