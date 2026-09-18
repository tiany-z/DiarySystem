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
  const bottomRef = useRef<HTMLDivElement>(null);

  // 消息变化或流式输出时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage?.content, streamingMessage?.thought, streamingMessage?.toolCalls]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isEmpty ? (
        <WelcomeSlate onSelectPrompt={onSelectPrompt} />
      ) : (
        <div style={{ maxWidth: "860px", width: "100%", margin: "0 auto" }}>
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

          <div ref={bottomRef} style={{ height: "1px" }} />
        </div>
      )}
    </div>
  );
};
