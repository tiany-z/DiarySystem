import React from "react";
import {
  Body1Strong,
  Button,
  Caption1,
  Card,
  CardFooter,
  CardHeader,
  Text,
  Tooltip,
} from "@fluentui/react-components";
import {
  Delete20Regular,
  Edit20Regular,
  Globe20Regular,
  LockClosed20Regular,
} from "@fluentui/react-icons";
import { DiaryItem } from "../api/diary";
import { MoodBadge } from "./MoodBadge";
import { WeatherBadge } from "./WeatherBadge";
import { useAppTheme } from "../context/ThemeContext";

interface NoteCardProps {
  diary: DiaryItem;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
  showActions?: boolean;
}

// 辅助函数：提取 Markdown 或 HTML 中的首张图片 URL 作为卡片封面图
export function extractFirstImage(content?: string | null): string | null {
  if (!content) return null;
  // 匹配 Markdown 格式: ![alt](url)
  const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch && mdMatch[1]) {
    return mdMatch[1].trim();
  }
  // 匹配 HTML 格式: <img ... src="..." ... />
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1].trim();
  }
  return null;
}

// 辅助函数：提取纯文本摘要 (过滤 Markdown 语法与 HTML 标签)
export function extractSnippet(mdText?: string | null, maxLen: number = 110): string {
  if (!mdText) return "暂无正文内容...";
  const hasImage = !!extractFirstImage(mdText);
  const clean = mdText
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/#+\s+/g, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`{1,3}.*?`{1,3}/gs, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/>\s+/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (!clean) {
    return hasImage ? "🖼️ [包含随笔插图]" : "暂无正文内容...";
  }
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

// 辅助函数：格式化时间字符串 (兼容 ISO、MySQL 格式与各种浏览器)
export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const cleanStr = dateStr.includes("T") ? dateStr : dateStr.replace(/-/g, "/");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

export const NoteCard: React.FC<NoteCardProps> = ({
  diary,
  onClick,
  onEdit,
  onDelete,
  onTogglePublic,
  showActions = false,
}) => {
  const { isDark } = useAppTheme();
  const isPublic = diary.is_public !== 0 && diary.is_public !== false;
  const coverImage = extractFirstImage(diary.content);

  return (
    <Card
      className="hover-lift"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: "14px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: isDark ? "#202026" : "#ffffff",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: isDark
          ? "0 4px 16px rgba(0, 0, 0, 0.3)"
          : "0 4px 20px rgba(0, 120, 212, 0.05)",
        padding: "20px 22px",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div>
        <CardHeader
          style={{ padding: 0, marginBottom: "12px" }}
          header={
            <Body1Strong
              style={{
                fontSize: "17px",
                lineHeight: 1.5,
                paddingBottom: "2px",
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {diary.title || "无标题日记"}
            </Body1Strong>
          }
          description={
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
              <Caption1 style={{ opacity: 0.65 }}>
                {formatDate(diary.created_at)}
              </Caption1>
              {isPublic ? (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    backgroundColor: isDark ? "rgba(0, 120, 212, 0.18)" : "rgba(0, 120, 212, 0.08)",
                    color: isDark ? "#60a5fa" : "#0078d4",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontWeight: 500,
                  }}
                >
                  <Globe20Regular style={{ fontSize: "12px" }} /> 公开
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                    color: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontWeight: 500,
                  }}
                >
                  <LockClosed20Regular style={{ fontSize: "12px" }} /> 私密
                </span>
              )}
            </div>
          }
        />

        {/* 随笔精选插图封面缩略图 */}
        {coverImage && (
          <div
            style={{
              width: "100%",
              height: "120px",
              borderRadius: "8px",
              overflow: "hidden",
              marginBottom: "12px",
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
            }}
          >
            <img
              src={coverImage}
              alt={diary.title || "随笔插图"}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}

        <Text
          size={300}
          style={{
            opacity: 0.85,
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: coverImage ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: "16px",
            minHeight: coverImage ? "36px" : "48px",
          }}
        >
          {extractSnippet(diary.content)}
        </Text>
      </div>

      <CardFooter
        style={{
          padding: "12px 0 0 0",
          borderTop: "1px solid rgba(128, 128, 128, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <WeatherBadge weather={diary.weather} />
          <MoodBadge mood={diary.mood} />
        </div>

        {showActions && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {onTogglePublic && (
              <Tooltip
                content={isPublic ? "当前为【公开】(点击切换为私密)" : "当前为【私密】(点击切换为公开)"}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  size="small"
                  icon={
                    isPublic ? (
                      <Globe20Regular style={{ color: "#0078d4" }} />
                    ) : (
                      <LockClosed20Regular style={{ color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.55)" }} />
                    )
                  }
                  onClick={onTogglePublic}
                  aria-label={isPublic ? "设为私密" : "设为公开"}
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: isPublic
                      ? (isDark ? "#60a5fa" : "#0078d4")
                      : (isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)"),
                  }}
                >
                  {isPublic ? "公开" : "私密"}
                </Button>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content="编辑这篇笔记" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Edit20Regular />}
                  onClick={onEdit}
                  aria-label="编辑"
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip content="删除笔记" relationship="label">
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Delete20Regular style={{ color: "#e74c3c" }} />}
                  onClick={onDelete}
                  aria-label="删除"
                />
              </Tooltip>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
