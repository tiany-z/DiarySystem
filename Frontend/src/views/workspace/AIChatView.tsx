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
import { useSettings } from "../../context/SettingsContext";
import { useAppTheme } from "../../context/ThemeContext";

export const AIChatView: React.FC = () => {
  const { isDark } = useAppTheme();
  const { openSettings } = useSettings();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  // 状态管理
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<AiMessageItem[]>([]);
  const [aiConfig, setAiConfig] = useState<UserAiConfig | null>(null);

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

  // 桌面端左侧栏宽度调节 (180px ~ 500px, 默认 280px, 支持持久化)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem("ai_chat_sidebar_width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 180 && parsed <= 500) {
        return parsed;
      }
    }
    return 280;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const handleStartResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(180, Math.min(500, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      const finalWidth = Math.max(180, Math.min(500, upEvent.clientX));
      localStorage.setItem("ai_chat_sidebar_width", String(finalWidth));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const skipNextFetchRef = useRef<string | null>(null);

  // 页面挂载时锁定 document.body 与 html 滚动，彻底杜绝全局滚动条和页面下窜散架
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

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
    const handleConfigUpdate = () => fetchConfig();
    window.addEventListener("ai:config_updated", handleConfigUpdate);
    return () => window.removeEventListener("ai:config_updated", handleConfigUpdate);
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
      // 若变动是由首条消息发送内部 URL replace 触发，跳过重复拉取，保持流式输出连贯性
      if (skipNextFetchRef.current === conversationId) {
        skipNextFetchRef.current = null;
        return;
      }
      setActiveId(conversationId);
      getAiMessages(conversationId).then((res) => {
        if (res.status === 1 && res.data?.messages) {
          setMessages(res.data.messages);
        }
      });
    } else {
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

  // 页面进入 AI 工作台时锁定网页全局溢出滚动，确保左侧栏与底部严丝合缝对齐视窗底边
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  // 新建会话
  const handleNewChat = () => {
    handleStopGeneration();
    skipNextFetchRef.current = null;
    setActiveId(null);
    setMessages([]);
    navigate("/workspace/ai");
    setIsSidebarOpen(false);
  };

  // 切换会话
  const handleSelectConversation = (id: string) => {
    if (id === activeId) return;
    handleStopGeneration();
    skipNextFetchRef.current = null;
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
      openSettings("ai");
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
            skipNextFetchRef.current = conv.conversationId;
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
            // 一旦正文内容开始吐出，说明上轮工具已经全部执行完毕，所有工具状态收敛为已完成，流光运行态立即隐去
            for (const tc of streamState.toolCalls) {
              if (tc.status === "running") {
                tc.status = "success";
              }
            }
            setStreamingMessage({ ...streamState });
          },
          onFinish: (data) => {
            // 回答结束时，确保所有工具调用均收敛为已完成态，彻底消除任何残留的运行中动画
            const finalizedToolCalls = streamState.toolCalls.map((tc) => ({
              ...tc,
              status: tc.status === "running" ? "success" : tc.status,
            }));
            const assistantMsg: AiMessageItem = {
              id: data.messageId || `msg-${Date.now()}`,
              role: "assistant",
              content: streamState.content,
              thought: streamState.thought || null,
              toolCalls: finalizedToolCalls.length > 0 ? finalizedToolCalls : null,
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
      className="ai-chat-page-container"
      style={{
        position: "fixed",
        top: isMobile ? "var(--header-height, 48px)" : "var(--header-height, 64px)",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        zIndex: 10,
      }}
    >
      {/* 1. PC 端左侧亚克力侧边栏 (动态宽度，支持拖拽调节) 物理脱离文档流固定在左侧，底边绝对对齐网页底边 */}
      {!isMobile && (
        <>
          <aside
            className="ai-chat-sidebar-fixed"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${sidebarWidth}px`,
              height: "100%",
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxSizing: "border-box",
              margin: 0,
              padding: 0,
              borderBottom: "none",
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
            />
          </aside>

          {/* 侧边栏拖拽把手 */}
          <div
            className={`ai-sidebar-resizer ${isResizing ? "is-dragging" : ""}`}
            onMouseDown={handleStartResize}
            title="按住拖拽调整侧边栏宽度"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${sidebarWidth - 3}px`,
              width: "6px",
              cursor: "col-resize",
              zIndex: 45,
            }}
          />
        </>
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
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* 抽屉内容区 */}
          <div
            className="win10-tile-rise win10-delay-1"
            style={{
              position: "relative",
              width: "280px",
              height: "100%",
              backgroundColor: isDark ? "#1e1e24" : "#ffffff",
              boxShadow: isDark ? "4px 0 24px rgba(0, 0, 0, 0.5)" : "4px 0 24px rgba(0, 0, 0, 0.2)",
              borderRight: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
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

      {/* 3. 右侧对话中枢视窗 - 物理脱离文档流固定定位在左侧栏右侧与整个视口右侧 */}
      <main
        className="ai-chat-main-viewport"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: isMobile ? 0 : `${sidebarWidth}px`,
          right: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          zIndex: 10,
        }}
      >
        {/* 对话顶栏 - 绝对脱离文档流固定在顶部 */}
        <header
          className="ai-chat-header-pinned"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
            backgroundColor: isDark ? "rgba(24, 24, 28, 0.75)" : "rgba(255, 255, 255, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            zIndex: 30,
            boxSizing: "border-box",
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
                  color: isDark ? "#cbd5e0" : "#4a5568",
                }}
              >
                <PanelLeft20Regular style={{ fontSize: "20px" }} />
              </button>
            )}

            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: isDark ? "#f7fafc" : "#2d3748",
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
                  background: isDark ? "rgba(91, 123, 141, 0.18)" : "rgba(91, 123, 141, 0.08)",
                  border: isDark ? "1px solid rgba(91, 123, 141, 0.3)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: isDark ? "#8EAEC0" : "#5B7B8D",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontWeight: 500,
                }}
              >
                <Add20Regular style={{ fontSize: "16px" }} />
                新对话
              </button>
            )}

            <button
              onClick={() => openSettings("ai")}
              title="设置"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                color: isDark ? "#a0aec0" : "#718096",
              }}
            >
              <Settings20Regular style={{ fontSize: "18px" }} />
            </button>
          </div>
        </header>

        {/* 消息历史滚动区 - 仅此内部独立滚动，顶部在顶栏下方，底部延伸至页面底边 */}
        <section
          key={activeId || "welcome"}
          className="ai-chat-messages-scroll-region"
          style={{
            position: "absolute",
            top: "48px",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          <ChatMessageList
            messages={messages}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            onSelectPrompt={handleSendMessage}
          />
        </section>

        {/* 底部输入发送中枢 - 绝对脱离文档流固定在右侧视窗最底部，拥有纯色半透明背景 */}
        <footer
          className="ai-chat-footer-pinned"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            zIndex: 30,
            boxSizing: "border-box",
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.78)" : "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
            boxShadow: isDark
              ? "0 -4px 20px rgba(0, 0, 0, 0.4)"
              : "0 -4px 20px rgba(0, 0, 0, 0.03)",
          }}
        >
          <ChatInputArea
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            isStreaming={isStreaming}
            modelName={aiConfig?.modelName}
            hasConfig={Boolean(aiConfig?.hasKey)}
            onOpenSettings={() => openSettings("ai")}
          />
        </footer>
      </main>
    </div>
  );
};
