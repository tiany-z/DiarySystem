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
      className="win10-tile-rise win10-delay-1"
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
      {/* 机器人头像徽标 */}
      <div
        className="win10-tile-rise win10-delay-1"
        style={{
          width: "54px",
          height: "54px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #5B7B8D 0%, #3e5866 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          boxShadow: isDark
            ? "0 8px 24px rgba(0, 0, 0, 0.45)"
            : "0 8px 24px rgba(91, 123, 141, 0.28)",
          marginBottom: "16px",
        }}
      >
        <Sparkle20Regular style={{ fontSize: "28px" }} />
      </div>

      <h2
        className="win10-tile-rise win10-delay-1"
        style={{
          margin: "0 0 8px 0",
          fontSize: "22px",
          fontWeight: 600,
          color: isDark ? "#f7fafc" : "#2d3748",
        }}
      >
        AI 助手
      </h2>

      <p
        className="win10-tile-rise win10-delay-2"
        style={{
          margin: "0 0 16px 0",
          fontSize: "14px",
          color: isDark ? "#a0aec0" : "#718096",
          maxWidth: "460px",
          lineHeight: "1.6",
        }}
      >
        可以帮你检索日记、分析情绪走势、起草内容或查找网络信息。
      </p>
    </div>
  );
};

export default WelcomeSlate;
