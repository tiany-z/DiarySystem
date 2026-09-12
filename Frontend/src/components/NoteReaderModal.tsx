import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import { Checkmark20Regular, Copy20Regular, Dismiss20Regular, Edit20Regular, Share20Regular } from "@fluentui/react-icons";
import { DiaryItem } from "../api/diary";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { MarkdownViewer } from "./MarkdownViewer";
import { MoodBadge } from "./MoodBadge";
import { formatDate } from "./NoteCard";
import { WeatherBadge } from "./WeatherBadge";

interface NoteReaderModalProps {
  diary: DiaryItem | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (diary: DiaryItem) => void;
}

export const NoteReaderModal: React.FC<NoteReaderModalProps> = ({
  diary,
  open,
  onClose,
  onEdit,
}) => {
  const { isDark } = useAppTheme();
  const { user, isAuthenticated } = useAuth();

  const [copiedLink, setCopiedLink] = useState(false);

  if (!diary) return null;

  const isOwner = isAuthenticated && user && diary.user_id === user.userId;

  const handleCopyLink = () => {
    if (!diary) return;
    const url = `${window.location.origin}/?note=${diary.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface
        backdrop={{
          style: {
            backdropFilter: "blur(12px) saturate(135%)",
            WebkitBackdropFilter: "blur(12px) saturate(135%)",
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.4)",
          },
        }}
        style={{
          maxWidth: "840px",
          width: "92vw",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          padding: "24px 28px",
          backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark
            ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
            : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)",
        }}
      >
        <DialogBody style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {/* Header */}
          <div className="dialog-header-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", width: "100%", marginBottom: "16px" }}>
            <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
              <DialogTitle style={{ padding: 0, margin: 0 }}>
                <Title3
                  style={{
                    fontWeight: 700,
                    fontSize: "20px",
                    letterSpacing: "-0.3px",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}
                >
                  {diary.title || "无标题日记"}
                </Title3>
              </DialogTitle>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <WeatherBadge weather={diary.weather} />
                <MoodBadge mood={diary.mood} />
                <span
                  style={{
                    fontSize: "12px",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                    color: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)",
                  }}
                >
                  {formatDate(diary.created_at)}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", flexShrink: 0 }}>
              <Tooltip content={copiedLink ? "公开链接已复制到剪贴板！" : "复制公开笔记链接"} relationship="label">
                <Button
                  className="dialog-share-btn"
                  appearance="subtle"
                  icon={copiedLink ? <Checkmark20Regular style={{ color: "#107c41" }} /> : <Share20Regular />}
                  onClick={handleCopyLink}
                  aria-label="分享公开笔记"
                  style={{
                    borderRadius: "8px",
                    fontWeight: 500,
                    color: copiedLink ? "#107c41" : undefined,
                  }}
                >
                  {copiedLink ? "已复制" : "分享"}
                </Button>
              </Tooltip>

              <Tooltip content="关闭" relationship="label">
                <Button
                  className="dialog-close-btn"
                  appearance="subtle"
                  icon={<Dismiss20Regular />}
                  onClick={onClose}
                  aria-label="关闭"
                />
              </Tooltip>
            </div>
          </div>

          {/* Markdown Content Area */}
          <DialogContent
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              margin: 0,
              padding: "6px 12px 12px 6px",
              boxSizing: "border-box",
            }}
          >
            <MarkdownViewer content={diary.content} />
          </DialogContent>

          {/* Footer Actions - 原生 Fluent 2 按钮，无多余线条 */}
          <DialogActions
            style={{
              marginTop: "20px",
              padding: 0,
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            {onEdit && (
              <Button
                appearance="primary"
                icon={isOwner ? <Edit20Regular /> : <Copy20Regular />}
                onClick={() => {
                  onClose();
                  onEdit(diary);
                }}
              >
                {isOwner ? "编辑" : "使用模板"}
              </Button>
            )}
            <Button appearance="secondary" onClick={onClose}>
              关闭
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};


