import React, { useState } from "react";
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
  ChevronDown20Regular,
  ChevronRight20Regular,
  Document20Regular,
} from "@fluentui/react-icons";

interface ToolCallBadgeProps {
  tool: string;
  args?: any;
  summary?: string;
  status?: "running" | "success" | "failed";
  data?: any;
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  search_diaries: { label: "检索日记", icon: <Search20Regular /> },
  locate_diary_content: { label: "定位内容", icon: <Document20Regular /> },
  read_diary_detail: { label: "读取日记", icon: <Document20Regular /> },
  get_diary_timeline_stats: { label: "数据统计", icon: <DataPie20Regular /> },
  create_diary: { label: "新建日记", icon: <Add20Regular /> },
  update_diary: { label: "更新日记", icon: <DocumentEdit20Regular /> },
  delete_diary: { label: "删除日记", icon: <Delete20Regular /> },
  web_search: { label: "网络搜索", icon: <Globe20Regular /> },
};

export const ToolCallBadge: React.FC<ToolCallBadgeProps> = ({
  tool,
  args,
  summary,
  status = "running",
  data,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const meta = TOOL_META[tool] || { label: tool, icon: <Search20Regular /> };

  const isRunning = status === "running";
  const isSuccess = status === "success";

  return (
    <div
      style={{
        margin: "8px 0",
        borderRadius: "8px",
        border: "1px solid rgba(0, 0, 0, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        fontSize: "12px",
        transition: "all 0.2s ease",
      }}
    >
      {/* 胶囊条 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              color: "#5B7B8D",
              display: "flex",
              alignItems: "center",
              fontSize: "16px",
            }}
          >
            {meta.icon}
          </span>

          <span style={{ fontWeight: 600, color: "#2d3748" }}>{meta.label}</span>

          {isRunning ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Spinner size="extra-tiny" />
              <span style={{ color: "#718096" }}>执行中...</span>
            </div>
          ) : (
            <span style={{ color: "#4a5568" }}>
              {summary || (isSuccess ? "完成" : "失败")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isSuccess && (
            <CheckmarkCircle20Filled
              style={{ color: "#38a169", fontSize: "16px" }}
            />
          )}
          {status === "failed" && (
            <DismissCircle20Regular
              style={{ color: "#e53e3e", fontSize: "16px" }}
            />
          )}
          {isExpanded ? (
            <ChevronDown20Regular style={{ fontSize: "14px", color: "#a0aec0" }} />
          ) : (
            <ChevronRight20Regular style={{ fontSize: "14px", color: "#a0aec0" }} />
          )}
        </div>
      </div>

      {/* 展开的入参和返回值详情 */}
      {isExpanded && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            borderTop: "1px dashed rgba(0, 0, 0, 0.08)",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: "11px",
            lineHeight: "1.5",
            color: "#4a5568",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {args && (
            <div style={{ marginBottom: "6px" }}>
              <div style={{ fontWeight: 600, color: "#718096" }}>参数:</div>
              <pre style={{ margin: "2px 0", whiteSpace: "pre-wrap" }}>
                {typeof args === "object"
                  ? JSON.stringify(args, null, 2)
                  : String(args)}
              </pre>
            </div>
          )}
          {data && (
            <div>
              <div style={{ fontWeight: 600, color: "#718096" }}>结果:</div>
              <pre style={{ margin: "2px 0", whiteSpace: "pre-wrap" }}>
                {typeof data === "object"
                  ? JSON.stringify(data, null, 2)
                  : String(data)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
