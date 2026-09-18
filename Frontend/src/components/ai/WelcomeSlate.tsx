import React from "react";
import {
  Sparkle20Regular,
  DataPie20Regular,
  Search20Regular,
  DocumentEdit20Regular,
  Globe20Regular,
} from "@fluentui/react-icons";

interface WelcomeSlateProps {
  onSelectPrompt: (prompt: string) => void;
}

const INSPIRATION_CARDS = [
  {
    icon: <DataPie20Regular style={{ color: "#5B7B8D", fontSize: "20px" }} />,
    title: "分析近期心情走势",
    desc: "统计近期情绪分布与记录规律",
    prompt: "请分析我近期日记中的心情走势和记录习惯。",
  },
  {
    icon: <Search20Regular style={{ color: "#38a169", fontSize: "20px" }} />,
    title: "查找特定日记",
    desc: "快速定位旅行或重要事件的记录",
    prompt: "帮我检索日记中关于旅行和重要事件的记录。",
  },
  {
    icon: <DocumentEdit20Regular style={{ color: "#d69e2e", fontSize: "20px" }} />,
    title: "起草今日随笔",
    desc: "将碎片想法整理成篇",
    prompt: "我今天有些想法，请帮我梳理并起草一篇日记。",
  },
  {
    icon: <Globe20Regular style={{ color: "#3182ce", fontSize: "20px" }} />,
    title: "实时网络搜索",
    desc: "查询最新资讯与客观资料",
    prompt: "搜索并总结近期科技领域的重要动态。",
  },
];

export const WelcomeSlate: React.FC<WelcomeSlateProps> = ({ onSelectPrompt }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      {/* 机器人头像徽标 */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #5B7B8D 0%, #3e5866 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          boxShadow: "0 8px 24px rgba(91, 123, 141, 0.3)",
          marginBottom: "16px",
        }}
      >
        <Sparkle20Regular style={{ fontSize: "28px" }} />
      </div>

      <h2
        style={{
          margin: "0 0 8px 0",
          fontSize: "22px",
          fontWeight: 600,
          color: "#2d3748",
        }}
      >
        AI 助手
      </h2>

      <p
        style={{
          margin: "0 0 32px 0",
          fontSize: "14px",
          color: "#718096",
          maxWidth: "480px",
          lineHeight: "1.6",
        }}
      >
        可以帮你检索日记、分析情绪走势、起草内容或查找网络信息。
      </p>

      {/* 灵感卡片 2x2 栅格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
          width: "100%",
        }}
      >
        {INSPIRATION_CARDS.map((card, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPrompt(card.prompt)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(91, 123, 141, 0.15)";
              e.currentTarget.style.borderColor = "rgba(91, 123, 141, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.04)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(0, 0, 0, 0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>

            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#2d3748",
                  marginBottom: "4px",
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#718096",
                  lineHeight: "1.4",
                }}
              >
                {card.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
