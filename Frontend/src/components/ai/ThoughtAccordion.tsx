import React, { useState } from "react";
import {
  Sparkle20Regular,
  ChevronDown20Regular,
  ChevronRight20Regular,
} from "@fluentui/react-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface ThoughtAccordionProps {
  thought: string;
  isGenerating?: boolean;
}

export const ThoughtAccordion: React.FC<ThoughtAccordionProps> = ({
  thought,
  isGenerating = false,
}) => {
  const { isDark } = useAppTheme();
  // 思考过程默认收起，点击后展开查看
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!thought && !isGenerating) {
    return null;
  }

  const labelText = isGenerating ? "思考中..." : "思考过程";

  return (
    <div
      className="gemini-thought-accordion"
      style={{
        marginBottom: "12px",
        borderRadius: "8px",
        overflow: "hidden",
        transition: "background-color 0.2s ease",
      }}
    >
      {/* 顶部标题栏：Gemini 网页版极简折叠标签 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 8px 5px 4px",
          borderRadius: "6px",
          cursor: "pointer",
          userSelect: "none",
          color: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)",
          fontSize: "12.5px",
          fontWeight: 500,
          transition: "all 0.18s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark
            ? "rgba(255, 255, 255, 0.06)"
            : "rgba(0, 0, 0, 0.04)";
          e.currentTarget.style.color = isDark ? "#ffffff" : "#1f1f1f";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = isDark
            ? "rgba(255, 255, 255, 0.65)"
            : "rgba(0, 0, 0, 0.6)";
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
            color: isGenerating ? (isDark ? "#8ab4f8" : "#1a73e8") : "inherit",
          }}
          className={isGenerating ? "gemini-sparkle-spin" : ""}
        >
          <Sparkle20Regular style={{ fontSize: "14px" }} />
        </span>

        <span>{labelText}</span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            opacity: 0.7,
            marginLeft: "2px",
          }}
        >
          {isExpanded ? (
            <ChevronDown20Regular style={{ fontSize: "13px" }} />
          ) : (
            <ChevronRight20Regular style={{ fontSize: "13px" }} />
          )}
        </span>
      </div>

      {/* 展开的思考过程：Gemini 风格的左侧极细灰线与柔和文字排版 */}
      {isExpanded && (
        <div
          style={{
            marginTop: "6px",
            marginLeft: "6px",
            paddingLeft: "12px",
            borderLeft: isDark
              ? "2px solid rgba(255, 255, 255, 0.12)"
              : "2px solid rgba(0, 0, 0, 0.1)",
            fontSize: "12.5px",
            lineHeight: "1.65",
            color: isDark ? "rgba(255, 255, 255, 0.62)" : "rgba(0, 0, 0, 0.62)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "380px",
            overflowY: "auto",
          }}
        >
          {thought || "正在组织思路..."}
          {isGenerating && <span className="gemini-typing-pulse" />}
        </div>
      )}
    </div>
  );
};

