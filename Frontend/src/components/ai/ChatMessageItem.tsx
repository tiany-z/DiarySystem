import React, { useState } from "react";
import { Bot20Regular, Person20Regular, Copy20Regular, Checkmark20Regular } from "@fluentui/react-icons";
import { AiMessageItem } from "../../api/ai";
import { useAppTheme } from "../../context/ThemeContext";
import { ThoughtAccordion } from "./ThoughtAccordion";
import { AgentActivityBar } from "./ToolCallBadge";
import { TypewriterMarkdown } from "./TypewriterMarkdown";

interface ChatMessageItemProps {
  message: AiMessageItem;
  isStreaming?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isStreaming = false,
}) => {
  const { isDark } = useAppTheme();
  const isUser = message.role === "user";
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
          padding: "0 8px",
        }}
      >
        <div
          style={{
            maxWidth: "80%",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "16px 16px 4px 16px",
              background: "linear-gradient(135deg, #5B7B8D 0%, #4a6676 100%)",
              color: "#ffffff",
              fontSize: "14px",
              lineHeight: "1.6",
              boxShadow: "0 4px 14px rgba(91, 123, 141, 0.25)",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.content}
          </div>

          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: isDark ? "rgba(91, 123, 141, 0.3)" : "rgba(91, 123, 141, 0.15)",
              color: isDark ? "#8EAEC0" : "#5B7B8D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Person20Regular style={{ fontSize: "18px" }} />
          </div>
        </div>
      </div>
    );
  }

  // Assistant 消息渲染
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: "24px",
        padding: "0 8px",
      }}
    >
      <div
        style={{
          maxWidth: "92%",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          width: "100%",
        }}
      >
        {/* AI 头像徽章 */}
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #5B7B8D 0%, #3a505c 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(91, 123, 141, 0.2)",
          }}
        >
          <Bot20Regular style={{ fontSize: "20px" }} />
        </div>

        {/* 消息正文与辅助卡片区 */}
        <div
          className="ai-bubble-acrylic"
          style={{
            flex: 1,
            padding: "16px 20px",
            borderRadius: "4px 16px 16px 16px",
            backgroundColor: isDark ? "rgba(30, 33, 40, 0.85)" : "rgba(255, 255, 255, 0.75)",
            backdropFilter: "blur(20px)",
            position: "relative",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* 思维链折叠卡片 (若存在思维链或正在生成中) */}
          {(message.thought || (isStreaming && !message.content)) && (
            <ThoughtAccordion
              thought={message.thought || ""}
              isGenerating={isStreaming && !message.content}
            />
          )}

          {/* 工具调用过程：单行动效渐变条 / 微胶囊链条 */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <AgentActivityBar
              toolCalls={message.toolCalls}
              isStreaming={isStreaming}
            />
          )}

          {/* 正文 Markdown 与渐变打字机 */}
          <TypewriterMarkdown
            content={message.content}
            isStreaming={isStreaming}
          />

          {/* 底部小工具栏 (复制) */}
          {message.content && !isStreaming && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "10px",
                borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.05)",
                paddingTop: "6px",
              }}
            >
              <button
                onClick={handleCopy}
                title="复制"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  color: isDark ? "#a0aec0" : "#718096",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {copied ? (
                  <>
                    <Checkmark20Regular style={{ color: "#38a169", fontSize: "14px" }} />
                    <span style={{ color: "#38a169" }}>已复制</span>
                  </>
                ) : (
                  <>
                    <Copy20Regular style={{ fontSize: "14px" }} />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
