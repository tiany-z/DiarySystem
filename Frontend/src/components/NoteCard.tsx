import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
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
import { MoodIcon } from "./MoodBadge";
import { WeatherIcon } from "./WeatherBadge";
import { useAppTheme } from "../context/ThemeContext";
import { markdownToHtml } from "../utils/markdownUtils";

interface NoteCardProps {
  diary: DiaryItem;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
  showActions?: boolean;
  showVisibilityBadge?: boolean;
  showAuthor?: boolean;
}

// 辅助函数：提取 Markdown 或 HTML 中的首张图片 URL 作为卡片封面图
export function extractFirstImage(content?: string | null): string | null {
  if (!content) return null;
  // 匹配 Markdown 格式: ![alt](url) 或 ![alt](url "title")
  const mdMatch = content.match(/!\[.*?\]\((\S+?)(?:\s+["'].*?["'])?\)/);
  if (mdMatch && mdMatch[1]) {
    return mdMatch[1].trim();
  }
  // 匹配 HTML 格式: <img ... src="..." ... /> (包含单双引号或无引号)
  const htmlMatch = content.match(/<img[^>]+src=["']?([^"'>\s]+)["']?/i);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1].trim();
  }
  return null;
}

// 辅助函数：提取纯文本摘要 (过滤 Markdown 语法与 HTML 标签)
export function extractSnippet(mdText?: string | null, maxLen: number = 110): string {
  if (!mdText) return "";
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
    .replace(/🖼️\s*\[?包含随笔插图\]?/g, "")
    .trim();

  if (!clean) {
    return hasImage ? "" : "暂无正文内容...";
  }
  return clean.length > maxLen ? clean.slice(0, maxLen) + "..." : clean;
}

// 辅助函数：提取 Markdown 内容前半部分供卡片轻量渲染预览 (过滤图片语法并去除冗余的重复 H1 标题)
export function extractMarkdownPreview(
  mdText?: string | null,
  diaryTitle?: string | null,
  maxChars: number = 420
): string {
  if (!mdText || !mdText.trim()) return "";

  let text = mdText.trim();

  // 1. 如果首行是与日记标题完全一致的 Markdown H 标题，跳过首行避免与卡片标题重复
  if (diaryTitle && diaryTitle.trim()) {
    const trimmedTitle = diaryTitle.trim();
    const firstLineMatch = text.match(/^#+\s*(.+?)(?:\r?\n|$)/);
    if (firstLineMatch && firstLineMatch[1].trim() === trimmedTitle) {
      text = text.slice(firstLineMatch[0].length).trim();
    }
  }

  // 2. 移除图片语法，卡片封面已在独立区域展示，正文预览专注文字排版
  text = text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/<img[^>]*>/gi, "")
    .trim();

  if (!text) return "";

  if (text.length <= maxChars) {
    return text;
  }

  // 3. 在截断点附近寻找换行或标点，避免切碎语法或词汇
  let cut = maxChars;
  const nextNewline = text.indexOf("\n", maxChars);
  if (nextNewline !== -1 && nextNewline - maxChars < 60) {
    cut = nextNewline;
  } else {
    const prevNewline = text.lastIndexOf("\n", maxChars);
    if (prevNewline > maxChars * 0.75) {
      cut = prevNewline;
    }
  }

  return text.slice(0, cut).trim();
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
  showVisibilityBadge = false,
  showAuthor,
}) => {
  const { isDark } = useAppTheme();
  const isPublic = diary.is_public !== 0 && diary.is_public !== false;
  const coverImage = extractFirstImage(diary.content);
  const snippet = extractSnippet(diary.content);
  const shouldShowAuthor = showAuthor !== undefined ? showAuthor : !showActions;
  const authorName = diary.nickname || diary.username || "拾光用户";

  const previewRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // 提取前半部分并进行轻量级 Markdown -> HTML 编译
  const previewHtml = useMemo(() => {
    if (!diary.content || !diary.content.trim()) return "";
    const previewMd = extractMarkdownPreview(diary.content, diary.title);
    if (!previewMd) return "";
    return markdownToHtml(previewMd);
  }, [diary.content, diary.title]);

  // 监听并检测卡片正文高度是否超出限制
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 2);
    };

    checkOverflow();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        checkOverflow();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [previewHtml, coverImage]);

  return (
    <Card
      className="hover-lift"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: "14px",
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: isDark ? "#202026" : "#ffffff",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: isDark
          ? "0 4px 16px rgba(0, 0, 0, 0.3)"
          : "0 4px 20px rgba(91, 123, 141, 0.08)",
        padding: "20px 22px 18px 22px",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ flex: "1 1 auto", minHeight: 0, minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
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
                wordBreak: "break-word",
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
              {showVisibilityBadge && (
                isPublic ? (
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      backgroundColor: isDark ? "rgba(91, 123, 141, 0.22)" : "rgba(91, 123, 141, 0.1)",
                      color: isDark ? "#8EAEC0" : "#5B7B8D",
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
                )
              )}
            </div>
          }
        />

        {/* 随笔精选插图封面缩略图：若为纯图片笔记，则自适应延展充满正文区域并透过底部用户信息渐隐 */}
        {coverImage && (
          <div
            className={`note-card-cover-container ${!previewHtml ? "is-pure-image" : ""}`}
            style={{
              width: "100%",
              height: previewHtml ? "120px" : "auto",
              flex: previewHtml ? "0 0 120px" : "1 1 auto",
              minHeight: previewHtml ? "120px" : "180px",
              maxHeight: previewHtml ? "120px" : "280px",
              borderRadius: "8px",
              overflow: "hidden",
              marginBottom: previewHtml ? "12px" : "0px",
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
              flexShrink: previewHtml ? 0 : 1,
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

        {/* 笔记卡片 Markdown 前半部分轻量渲染预览 (超出卡片内容范围不滚动，底部渐变过渡隐藏) */}
        {previewHtml ? (
          <div
            ref={previewRef}
            className={`note-card-preview-wrapper ${coverImage ? "has-cover" : ""} ${isOverflowing ? "is-overflowing" : ""}`}
            style={{
              position: "relative",
              maxHeight: coverImage ? "165px" : "155px",
              minHeight: coverImage ? "38px" : "56px",
              overflow: "hidden",
              marginBottom: "0px",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <div
              className="note-card-mini-markdown markdown-body"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        ) : !coverImage ? (
          <div
            style={{
              opacity: 0.5,
              fontSize: "13px",
              lineHeight: 1.6,
              marginBottom: "8px",
              minHeight: "48px",
            }}
          >
            暂无正文内容...
          </div>
        ) : null}
      </div>

      {/* 底部渐变遮罩：底边到用户信息遮住50%处为纯色遮罩，往上渐变为全透明；无论是文字溢出还是纯图片内容，均保持平滑过渡遮罩 */}
      {(previewHtml || coverImage) && (
        <div
          className="note-card-bottom-fade"
          aria-hidden="true"
        />
      )}

      <CardFooter
        style={{
          position: "absolute",
          bottom: "16px",
          left: "22px",
          right: "22px",
          zIndex: 2,
          padding: 0,
          borderTop: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          background: "transparent",
        }}
      >
        {shouldShowAuthor ? (
          /* 首页笔记卡片：左侧对齐显示用户头像和用户名称 */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
              flex: 1,
            }}
          >
            <Avatar
              size={24}
              image={diary.avatar ? { src: diary.avatar } : undefined}
              aria-label={authorName}
              color="brand"
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                opacity: isDark ? 0.9 : 0.85,
                maxWidth: "140px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: isDark ? "#ffffff" : "#1a1a1a",
              }}
              title={authorName}
            >
              {authorName}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <WeatherIcon weather={diary.weather} />
            <MoodIcon mood={diary.mood} />
          </div>
        )}

        {shouldShowAuthor ? (
          /* 首页笔记卡片：右侧对齐显示心情与天气图标 */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <WeatherIcon weather={diary.weather} />
            <MoodIcon mood={diary.mood} />
          </div>
        ) : showActions ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {onTogglePublic && (
              <Tooltip
                content={isPublic ? "公开" : "私密"}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  size="small"
                  icon={
                    isPublic ? (
                      <Globe20Regular style={{ color: "#5B7B8D" }} />
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
                      ? (isDark ? "#8EAEC0" : "#5B7B8D")
                      : (isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)"),
                  }}
                >
                  {isPublic ? "公开" : "私密"}
                </Button>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip content="编辑" relationship="label">
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
              <Tooltip content="删除" relationship="label">
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
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <WeatherIcon weather={diary.weather} />
            <MoodIcon mood={diary.mood} />
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
