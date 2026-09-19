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

  // 自动根据文本行数调整高度 (38px ~ 160px)
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 38), 160);
    el.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const isMultiLine =
    text.includes("\n") ||
    (textareaRef.current ? textareaRef.current.scrollHeight > 48 : false);

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
      textareaRef.current.style.height = "38px";
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
            请先配置模型
          </span>
          <Settings20Regular style={{ fontSize: "16px" }} />
        </div>
      )}

      {/* 核心悬浮输入 Dock：Gemini 网页版大圆角胶囊 + Win11 云母透感 */}
      <div
        data-win10-tile
        className="gemini-chat-dock win11-mica-dock"
        style={{
          width: "100%",
          borderRadius: "26px",
          display: "flex",
          alignItems: isMultiLine ? "flex-end" : "center",
          padding: isMobile ? "4px 8px 4px 16px" : "6px 12px 6px 20px",
          gap: "8px",
          minHeight: "52px",
          boxSizing: "border-box",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasConfig
              ? "问问 AI 助手..."
              : "请先配置模型参数"
          }
          rows={1}
          style={{
            flex: 1,
            position: "relative",
            zIndex: 2,
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            fontSize: "14.5px",
            lineHeight: "22px",
            color: isDark ? "#f7fafc" : "#1f1f1f",
            resize: "none",
            padding: "8px 0",
            maxHeight: "160px",
            minHeight: "38px",
            height: "38px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />

        {/* 发送 / 终止生成 圆形按钮 */}
        <button
          onClick={isStreaming ? onStopGeneration : handleSend}
          title={isStreaming ? "停止" : "发送"}
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            backgroundColor: isStreaming
              ? "#ea4335"
              : text.trim()
              ? (isDark ? "#ffffff" : "#1f1f1f")
              : "transparent",
            color: isStreaming
              ? "#ffffff"
              : text.trim()
              ? (isDark ? "#1f1f1f" : "#ffffff")
              : isDark
              ? "rgba(255, 255, 255, 0.3)"
              : "rgba(0, 0, 0, 0.3)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: text.trim() || isStreaming ? "pointer" : "default",
            transition: "all 0.18s ease",
            marginBottom: isMultiLine ? "4px" : "0",
            flexShrink: 0,
          }}
        >
          {isStreaming ? (
            <Stop20Filled style={{ fontSize: "15px" }} />
          ) : (
            <Send20Filled style={{ fontSize: "16px" }} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInputArea;
