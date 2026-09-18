import React, { useEffect, useRef } from "react";
import { AiMessageItem } from "../../api/ai";
import { ChatMessageItem } from "./ChatMessageItem";
import { WelcomeSlate } from "./WelcomeSlate";

interface ChatMessageListProps {
  messages: AiMessageItem[];
  streamingMessage?: {
    content: string;
    thought?: string;
    toolCalls?: any[];
  } | null;
  isStreaming?: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  streamingMessage,
  isStreaming = false,
  onSelectPrompt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 消息变化或流式输出时自动滚动到底部（使用容器原生 scrollTo，绝对不会影响外部顶栏或引发整个页面滚动）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [messages, streamingMessage?.content, streamingMessage?.thought, streamingMessage?.toolCalls, isStreaming]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "12px 10px 140px" : "20px 24px 150px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        minHeight: 0,
      }}
    >
      {isEmpty ? (
        <WelcomeSlate onSelectPrompt={onSelectPrompt} />
      ) : (
        <div
          style={{ maxWidth: "860px", width: "100%", margin: "0 auto" }}
        >
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))}

          {/* 正在流式生成的 Assistant 临时气泡 */}
          {isStreaming && streamingMessage && (
            <ChatMessageItem
              message={{
                id: "streaming-temp",
                role: "assistant",
                content: streamingMessage.content,
                thought: streamingMessage.thought,
                toolCalls: streamingMessage.toolCalls,
                createdAt: new Date().toISOString(),
              }}
              isStreaming={true}
            />
          )}

          <div style={{ height: "1px" }} />
        </div>
      )}
    </div>
  );
};
