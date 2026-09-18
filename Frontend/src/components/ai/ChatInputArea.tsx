import React, { useState, useRef, useEffect } from "react";
import {
  Send20Filled,
  Stop20Filled,
  Settings20Regular,
  Warning20Regular,
} from "@fluentui/react-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface ChatInputAreaProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  isStreaming?: boolean;
  modelName?: string;
  hasConfig?: boolean;
  onOpenSettings: () => void;
}

const QUICK_PROMPTS = [
  "分析近期心情走势",
  "检索旅行相关日记",
  "整理今日随笔草稿",
  "查询最新科技动态",
];

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming = false,
  modelName,
  hasConfig = true,
  onOpenSettings,
}) => {
  const { isDark } = useAppTheme();
  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动根据文本行数调整高度 (44px ~ 160px)
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 160);
    el.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleSend = () => {
    if (isStreaming) {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    if (!hasConfig) {
      onOpenSettings();
      return;
    }

    onSendMessage(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // 避免中文拼音输入法敲回车被误触发
      if ((e.nativeEvent as any).isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="win10-tile-rise win10-delay-3"
      style={{
        padding: "10px 20px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "880px",
        margin: "0 auto",
      }}
    >
      {/* 未配置模型时的提示条 */}
      {!hasConfig && (
        <div
          onClick={onOpenSettings}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            marginBottom: "10px",
            borderRadius: "8px",
            backgroundColor: isDark ? "rgba(221, 107, 32, 0.2)" : "rgba(221, 107, 32, 0.12)",
            border: isDark ? "1px solid rgba(237, 137, 54, 0.4)" : "1px solid rgba(221, 107, 32, 0.3)",
            color: isDark ? "#fbd38d" : "#c05621",
            fontSize: "13px",
            cursor: "pointer",
            width: "100%",
            transition: "all 0.2s ease",
          }}
        >
          <Warning20Regular style={{ fontSize: "16px", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            尚未配置模型参数，点击此处前往设置
          </span>
          <Settings20Regular style={{ fontSize: "16px" }} />
        </div>
      )}

      {/* 快捷 Prompt 提示条 */}
      {!isStreaming && (
        <div
          className="win10-stagger-grid"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "4px",
          }}
        >
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setText(prompt);
                textareaRef.current?.focus();
              }}
              style={{
                whiteSpace: "nowrap",
                padding: "4px 12px",
                borderRadius: "14px",
                backgroundColor: isDark ? "rgba(36, 40, 48, 0.75)" : "rgba(255, 255, 255, 0.65)",
                backdropFilter: "blur(8px)",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                fontSize: "12px",
                color: isDark ? "#cbd5e0" : "#4a5568",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? "rgba(91, 123, 141, 0.25)"
                  : "rgba(91, 123, 141, 0.15)";
                e.currentTarget.style.borderColor = isDark
                  ? "rgba(142, 174, 192, 0.45)"
                  : "rgba(91, 123, 141, 0.3)";
                e.currentTarget.style.color = isDark ? "#8EAEC0" : "#5B7B8D";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? "rgba(36, 40, 48, 0.75)"
                  : "rgba(255, 255, 255, 0.65)";
                e.currentTarget.style.borderColor = isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.color = isDark ? "#cbd5e0" : "#4a5568";
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* 核心悬浮输入 Dock */}
      <div
        className="ai-bubble-acrylic"
        style={{
          width: "100%",
          borderRadius: "14px",
          backgroundColor: isDark ? "rgba(26, 28, 34, 0.85)" : "rgba(255, 255, 255, 0.82)",
          backdropFilter: "blur(24px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
          boxShadow: isDark ? "0 8px 32px rgba(0, 0, 0, 0.4)" : "0 6px 28px rgba(0, 0, 0, 0.08)",
          display: "flex",
          alignItems: "flex-end",
          padding: "6px 12px 6px 16px",
          gap: "8px",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasConfig
              ? "输入消息，Enter 发送，Shift+Enter 换行"
              : "请先配置模型参数"
          }
          rows={1}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            fontSize: "14px",
            lineHeight: "1.5",
            color: isDark ? "#f7fafc" : "#2d3748",
            resize: "none",
            padding: "8px 0",
            maxHeight: "160px",
            minHeight: "40px",
            fontFamily: "inherit",
          }}
        />

        {/* 发送 / 终止生成 按钮 */}
        <button
          onClick={isStreaming ? onStopGeneration : handleSend}
          title={isStreaming ? "停止" : "发送"}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            backgroundColor: isStreaming
              ? "#e53e3e"
              : text.trim()
              ? "#5B7B8D"
              : isDark
              ? "rgba(91, 123, 141, 0.25)"
              : "rgba(91, 123, 141, 0.3)",
            color: isStreaming || text.trim() ? "#ffffff" : isDark ? "#718096" : "#ffffff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: text.trim() || isStreaming ? "pointer" : "default",
            transition: "all 0.2s ease",
            marginBottom: "3px",
            flexShrink: 0,
          }}
        >
          {isStreaming ? (
            <Stop20Filled style={{ fontSize: "16px" }} />
          ) : (
            <Send20Filled style={{ fontSize: "16px" }} />
          )}
        </button>
      </div>

      {/* 底部引擎标识与设置引导 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "6px 8px 0",
          fontSize: "11px",
          color: isDark ? "#718096" : "#a0aec0",
        }}
      >
        <span>
          {modelName || "未配置模型"}
        </span>

        <span
          onClick={onOpenSettings}
          style={{
            cursor: "pointer",
            color: isDark ? "#8EAEC0" : "#5B7B8D",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <Settings20Regular style={{ fontSize: "13px" }} />
          模型设置
        </span>
      </div>
    </div>
  );
};
