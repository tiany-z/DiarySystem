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
          marginBottom: "18px",
          padding: "0 2px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "85%",
            padding: "10px 16px",
            borderRadius: "18px 18px 4px 18px",
            background: "linear-gradient(135deg, #5B7B8D 0%, #4a6676 100%)",
            color: "#ffffff",
            fontSize: "14px",
            lineHeight: "1.6",
            boxShadow: isDark
              ? "0 4px 16px rgba(0, 0, 0, 0.3)"
              : "0 4px 14px rgba(91, 123, 141, 0.22)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            userSelect: "text",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant 消息渲染：取消四周气泡、取消左上角头像、无底层地板直接横向最宽排版
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginBottom: "24px",
        padding: "0 2px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 思维链折叠卡片 (默认收起，用户手动点击后展开查看) */}
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

        {/* 正文 Markdown 与渐变打字机 (无底层地板，全宽通栏呈现) */}
        <div style={{ width: "100%", minWidth: 0 }}>
          <TypewriterMarkdown
            content={message.content}
            isStreaming={isStreaming}
          />
        </div>

        {/* 底部轻量复制栏 */}
        {message.content && !isStreaming && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "8px",
              paddingTop: "4px",
            }}
          >
            <button
              onClick={handleCopy}
              title="复制回答"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: isDark ? "#a0aec0" : "#718096",
                padding: "3px 8px",
                borderRadius: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              {copied ? (
                <>
                  <Checkmark20Regular style={{ color: "#38a169", fontSize: "14px" }} />
                  <span style={{ color: "#38a169", fontWeight: 500 }}>已复制</span>
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
  );
};
