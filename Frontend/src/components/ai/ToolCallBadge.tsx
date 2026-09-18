import React from "react";
import { Spinner } from "@fluentui/react-components";
import {
  Search20Regular,
  Globe20Regular,
  DocumentEdit20Regular,
  Add20Regular,
  Delete20Regular,
  DataPie20Regular,
  CheckmarkCircle20Filled,
  DismissCircle20Regular,
  Document20Regular,
  Sparkle20Regular,
  Clock20Regular,
  CalendarLtr20Regular,
  Emoji20Regular,
} from "@fluentui/react-icons";
import { useAppTheme } from "../../context/ThemeContext";

export interface ToolCallItem {
  id?: string;
  tool?: string;
  name?: string;
  args?: any;
  summary?: string;
  status?: "running" | "success" | "failed";
  data?: any;
}

export const TOOL_META: Record<
  string,
  { label: string; icon: React.ReactNode; hint: string }
> = {
  get_recent_diaries: {
    label: "最近手记",
    icon: <Clock20Regular style={{ fontSize: "13px" }} />,
    hint: "正在查阅您近期记录的心情与随笔...",
  },
  get_diaries_by_date: {
    label: "日期手记",
    icon: <CalendarLtr20Regular style={{ fontSize: "13px" }} />,
    hint: "正在调取指定日期的专属手记...",
  },
  analyze_mood_trends: {
    label: "情绪晴雨表",
    icon: <Emoji20Regular style={{ fontSize: "13px" }} />,
    hint: "正在分析近期的心理画像与心情走势...",
  },
  search_diaries: {
    label: "检索日记",
    icon: <Search20Regular style={{ fontSize: "13px" }} />,
    hint: "正在多维度检索日记库...",
  },
  locate_diary_content: {
    label: "定位内容",
    icon: <Document20Regular style={{ fontSize: "13px" }} />,
    hint: "正在精准扫描段落与行号...",
  },
  read_diary_detail: {
    label: "读取日记",
    icon: <Document20Regular style={{ fontSize: "13px" }} />,
    hint: "正在调阅日记全文内容...",
  },
  get_diary_timeline_stats: {
    label: "数据统计",
    icon: <DataPie20Regular style={{ fontSize: "13px" }} />,
    hint: "正在统计时间线与心情分布...",
  },
  create_diary: {
    label: "新建日记",
    icon: <Add20Regular style={{ fontSize: "13px" }} />,
    hint: "正在起草创建私密日记...",
  },
  update_diary: {
    label: "更新日记",
    icon: <DocumentEdit20Regular style={{ fontSize: "13px" }} />,
    hint: "正在更新保存日记修订...",
  },
  delete_diary: {
    label: "删除日记",
    icon: <Delete20Regular style={{ fontSize: "13px" }} />,
    hint: "正在处理日记软删除...",
  },
  web_search: {
    label: "网络搜索",
    icon: <Globe20Regular style={{ fontSize: "13px" }} />,
    hint: "正在全网检索客观最新资讯...",
  },
};

export interface AgentActivityBarProps {
  toolCalls: ToolCallItem[];
  isStreaming?: boolean;
}

/**
 * AI Agent 单行动态渐变工具活动状态条
 * - 运行中：呈现流光渐变呼吸动效的轻薄单行药丸条
 * - 已完成：呈现精致紧凑的微胶囊轨迹单行，下方直接展开 AI 回复正文
 */
export const AgentActivityBar: React.FC<AgentActivityBarProps> = ({
  toolCalls,
}) => {
  const { isDark } = useAppTheme();

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const runningTool = toolCalls.find((tc) => tc.status === "running");
  const hasRunning = Boolean(runningTool);

  // 1. 运行中态：单行动效流光渐变胶囊条
  if (hasRunning && runningTool) {
    const rawToolName = runningTool.tool || runningTool.name || "unknown";
    const meta = TOOL_META[rawToolName] || {
      label: rawToolName,
      icon: <Sparkle20Regular style={{ fontSize: "13px" }} />,
      hint: "正在分析与执行...",
    };

    return (
      <div
        className="agent-gradient-running-bar"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          height: "32px",
          padding: "0 14px",
          borderRadius: "16px",
          marginBottom: "10px",
          fontSize: "12px",
          backdropFilter: "blur(12px)",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            color: isDark ? "#8EAEC0" : "#5B7B8D",
            animation: "agentSpinSlow 4s linear infinite",
          }}
        >
          <Sparkle20Regular style={{ fontSize: "14px" }} />
        </span>

        <span
          style={{
            fontWeight: 600,
            color: isDark ? "#f7fafc" : "#2d3748",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>{meta.label}</span>
        </span>

        <span
          style={{
            color: isDark ? "#cbd5e0" : "#4a5568",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {runningTool.summary || meta.hint}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Spinner size="extra-tiny" />
        </div>
      </div>
    );
  }

  // 2. 完成态：单行紧凑轻量级微胶囊链路
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "10px",
        overflowX: "auto",
        whiteSpace: "nowrap",
        scrollbarWidth: "none",
        padding: "2px 0",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: isDark ? "#8EAEC0" : "#5B7B8D",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        <Sparkle20Regular style={{ fontSize: "12px" }} />
        工具调用
      </span>

      {toolCalls.map((tc, idx) => {
        const rawToolName = tc.tool || tc.name || "unknown";
        const meta = TOOL_META[rawToolName] || {
          label: rawToolName,
          icon: <Document20Regular style={{ fontSize: "12px" }} />,
          hint: "",
        };
        const isSuccess = tc.status === "success" || tc.status === undefined;
        const isFailed = tc.status === "failed";

        // 简短标签文案
        const textDisplay = tc.summary
          ? `${meta.label} · ${tc.summary}`
          : meta.label;

        return (
          <div
            key={tc.id || idx}
            title={tc.summary || (isSuccess ? "已成功执行" : "执行异常")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              backgroundColor: isDark
                ? "rgba(91, 123, 141, 0.16)"
                : "rgba(91, 123, 141, 0.08)",
              border: isDark
                ? "1px solid rgba(142, 174, 192, 0.2)"
                : "1px solid rgba(91, 123, 141, 0.16)",
              color: isDark ? "#cbd5e0" : "#4a5568",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            <span
              style={{
                color: isDark ? "#8EAEC0" : "#5B7B8D",
                display: "flex",
                alignItems: "center",
              }}
            >
              {meta.icon}
            </span>

            <span
              style={{
                maxWidth: "200px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {textDisplay}
            </span>

            {isSuccess && (
              <CheckmarkCircle20Filled
                style={{ color: "#38a169", fontSize: "11px" }}
              />
            )}
            {isFailed && (
              <DismissCircle20Regular
                style={{ color: "#e53e3e", fontSize: "11px" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// 保持对旧引用名称的兼容
export const ToolCallBadge: React.FC<{
  tool: string;
  args?: any;
  summary?: string;
  status?: "running" | "success" | "failed";
  data?: any;
}> = ({ tool, args, summary, status, data }) => {
  return (
    <AgentActivityBar
      toolCalls={[{ tool, args, summary, status, data }]}
    />
  );
};
