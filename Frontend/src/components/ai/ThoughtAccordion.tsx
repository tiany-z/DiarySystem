import React, { useState, useEffect, useRef } from "react";
import {
  BrainCircuit20Regular,
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
  const [isExpanded, setIsExpanded] = useState<boolean>(isGenerating);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const hasEverGeneratedRef = useRef<boolean>(isGenerating);

  useEffect(() => {
    let timer: any = null;
    if (isGenerating) {
      hasEverGeneratedRef.current = true;
      startTimeRef.current = Date.now();
      timer = setInterval(() => {
        setElapsedSeconds((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } else {
      if (hasEverGeneratedRef.current) {
        // 生成结束时，默认自动收起思考过程，使正文成为视觉焦点
        setIsExpanded(false);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGenerating]);

  if (!thought && !isGenerating) {
    return null;
  }

  const showTime = isGenerating || hasEverGeneratedRef.current;
  const formattedTime = showTime
    ? elapsedSeconds >= 1
      ? `${elapsedSeconds.toFixed(1)} 秒`
      : `${(elapsedSeconds * 1000).toFixed(0)} 毫秒`
    : "";

  return (
    <div
      style={{
        marginBottom: "12px",
        borderRadius: "8px",
        border: isDark
          ? "1px solid rgba(91, 123, 141, 0.35)"
          : "1px solid rgba(91, 123, 141, 0.2)",
        backgroundColor: isDark
          ? "rgba(91, 123, 141, 0.12)"
          : "rgba(91, 123, 141, 0.05)",
        overflow: "hidden",
        transition: "all 0.2s ease-in-out",
      }}
    >
      {/* 顶部标题栏 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          cursor: "pointer",
          userSelect: "none",
          backgroundColor: isExpanded
            ? isDark
              ? "rgba(91, 123, 141, 0.2)"
              : "rgba(91, 123, 141, 0.08)"
            : "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            className={isGenerating ? "ai-thought-pulse" : ""}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: isGenerating
                ? "rgba(91, 123, 141, 0.25)"
                : isDark
                ? "rgba(91, 123, 141, 0.18)"
                : "rgba(91, 123, 141, 0.1)",
              color: isDark ? "#8EAEC0" : "#5B7B8D",
            }}
          >
            <BrainCircuit20Regular style={{ fontSize: "15px" }} />
          </div>

          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: isDark ? "#8EAEC0" : "#5B7B8D",
            }}
          >
            {isGenerating
              ? `思考中 ${formattedTime}`
              : formattedTime
              ? `已思考 ${formattedTime}`
              : "思考过程"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: isDark ? "#718096" : "#8a9ba8",
          }}
        >
          {isExpanded ? (
            <ChevronDown20Regular style={{ fontSize: "16px" }} />
          ) : (
            <ChevronRight20Regular style={{ fontSize: "16px" }} />
          )}
        </div>
      </div>

      {/* 展开的思考过程 */}
      {isExpanded && (
        <div
          style={{
            padding: "10px 14px",
            fontSize: "12px",
            lineHeight: "1.6",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            color: isDark ? "#cbd5e0" : "#607274",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "360px",
            overflowY: "auto",
            borderTop: isDark
              ? "1px solid rgba(91, 123, 141, 0.2)"
              : "1px solid rgba(91, 123, 141, 0.1)",
          }}
        >
          {thought || "正在思考..."}
          {isGenerating && <span className="ai-typing-cursor" />}
        </div>
      )}
    </div>
  );
};
