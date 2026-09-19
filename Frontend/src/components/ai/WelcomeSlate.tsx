import React from "react";
import { Sparkle20Regular } from "@fluentui/react-icons";
import { useAppTheme } from "../../context/ThemeContext";

interface WelcomeSlateProps {
  onSelectPrompt?: (prompt: string) => void;
}

export const WelcomeSlate: React.FC<WelcomeSlateProps> = () => {
  const { isDark } = useAppTheme();

  return (
    <div
      className="win10-tile-rise win10-delay-1 gemini-welcome-slate"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        textAlign: "center",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      {/* 项目主题色 Sparkle 图标徽标 (Fluent 2 极简云母微光风格) */}
      <div
        className="win10-tile-rise win10-delay-1"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          backgroundColor: isDark ? "rgba(91, 123, 141, 0.2)" : "rgba(91, 123, 141, 0.12)",
          border: isDark ? "1px solid rgba(142, 174, 192, 0.25)" : "1px solid rgba(91, 123, 141, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isDark ? "#8EAEC0" : "#5B7B8D",
          boxShadow: isDark
            ? "0 4px 16px rgba(0, 0, 0, 0.35)"
            : "0 4px 16px rgba(91, 123, 141, 0.12)",
          marginBottom: "16px",
        }}
      >
        <Sparkle20Regular style={{ fontSize: "24px" }} />
      </div>

      <h2
        className="win10-tile-rise win10-delay-1"
        style={{
          margin: "0 0 8px 0",
          fontSize: "24px",
          fontWeight: 600,
          color: isDark ? "#f4f4f5" : "#111827",
          letterSpacing: "-0.3px",
        }}
      >
        今天有什么我可以帮你的？
      </h2>

      <p
        className="win10-tile-rise win10-delay-2"
        style={{
          margin: "0 0 16px 0",
          fontSize: "14px",
          color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.55)",
          maxWidth: "460px",
          lineHeight: "1.6",
        }}
      >
        检索笔记、分析心境、润色文字或获取灵感洞察。
      </p>
    </div>
  );
};


export default WelcomeSlate;
