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

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming = false,
  modelName: _modelName,
  hasConfig = true,
  onOpenSettings,
}) => {
  const { isDark } = useAppTheme();
  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      style={{
        padding: isMobile ? "6px 8px max(10px, env(safe-area-inset-bottom))" : "10px 20px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "880px",
        margin: "0 auto",
        boxSizing: "border-box",
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

      {/* 核心悬浮输入 Dock */}
      <div
        className="ai-bubble-acrylic"
        style={{
          width: "100%",
          borderRadius: "14px",
          backgroundColor: isDark ? "rgba(30, 32, 38, 0.95)" : "#ffffff",
          backdropFilter: "blur(24px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "0 4px 16px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "flex-end",
          padding: isMobile ? "4px 8px 4px 12px" : "6px 12px 6px 16px",
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
    </div>
  );
};

export default ChatInputArea;
