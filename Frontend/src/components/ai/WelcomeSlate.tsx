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
      {/* Gemini 风格渐变 Sparkle 徽标 */}
      <div
        className="win10-tile-rise win10-delay-1 gemini-sparkle-halo"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #4285f4 0%, #9b72cf 50%, #d96570 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          boxShadow: isDark
            ? "0 4px 20px rgba(66, 133, 244, 0.35)"
            : "0 4px 18px rgba(66, 133, 244, 0.25)",
          marginBottom: "18px",
        }}
      >
        <Sparkle20Regular style={{ fontSize: "24px" }} />
      </div>

      <h2
        className="win10-tile-rise win10-delay-1"
        style={{
          margin: "0 0 10px 0",
          fontSize: "26px",
          fontWeight: 600,
          background: isDark
            ? "linear-gradient(74deg, #4285f4 0%, #9b72cf 35%, #d96570 70%)"
            : "linear-gradient(74deg, #1a73e8 0%, #8e24aa 40%, #d81b60 80%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
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
        帮你检索笔记、分析情绪心境、撰写文字或获取灵感洞察。
      </p>
    </div>
  );
};


export default WelcomeSlate;
