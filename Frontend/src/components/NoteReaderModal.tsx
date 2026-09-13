import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
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
import {
  Checkmark20Regular,
  ColumnTriple20Regular,
  Dismiss20Regular,
  Edit20Regular,
  FullScreenMaximize20Regular,
  Share20Regular,
  SlideGrid20Regular,
} from "@fluentui/react-icons";
import { DiaryItem } from "../api/diary";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { MarkdownViewer } from "./MarkdownViewer";
import { MoodIcon } from "./MoodBadge";
import { formatDate } from "./NoteCard";
import { WeatherIcon } from "./WeatherBadge";
import { useAppDialogMotion } from "../utils/dialogMotion";

export type ReaderWidthMode = "default" | "wider" | "full";

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
  const { surfaceMotion, backdropMotion } = useAppDialogMotion();

  const [copiedLink, setCopiedLink] = useState(false);

  // 监听是否为窄屏模式 (<= 768px)，窄屏全屏遮盖整个网页界面 (包括标题栏)
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => typeof window !== "undefined" && window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // 弹窗宽度挡位状态：默认当前 (default) / 更宽 (wider) / 全宽 (full)，持久化至本地
  const [widthMode, setWidthMode] = useState<ReaderWidthMode>(() => {
    const saved = localStorage.getItem("diary_reader_width_mode");
    if (saved === "wider" || saved === "full" || saved === "default") {
      return saved;
    }
    return "default";
  });

  const handleSetWidthMode = (mode: ReaderWidthMode) => {
    setWidthMode(mode);
    localStorage.setItem("diary_reader_width_mode", mode);
  };

  const lastDiaryRef = useRef<DiaryItem | null>(diary);
  if (diary) {
    lastDiaryRef.current = diary;
  }
  const currentDiary = diary || lastDiaryRef.current;

  if (!currentDiary) return null;

  const isOwner = isAuthenticated && user && currentDiary.user_id === user.userId;

  const handleCopyLink = () => {
    if (!currentDiary) return;
    const url = `${window.location.origin}/?note=${currentDiary.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 计算三挡对应的响应式宽度约束：当页面变窄时均自适应回落至页面的最大宽度 (calc(100vw - 32px))
  const getModalWidthStyle = (mode: ReaderWidthMode) => {
    if (isNarrowScreen) {
      return {
        width: "100vw",
        maxWidth: "100vw",
      };
    }
    switch (mode) {
      case "wider":
        return {
          width: "min(1080px, calc(100vw - 32px))",
          maxWidth: "calc(100vw - 32px)",
        };
      case "full":
        return {
          width: "min(1520px, calc(100vw - 48px))",
          maxWidth: "calc(100vw - 32px)",
        };
      case "default":
      default:
        return {
          width: "min(780px, calc(100vw - 32px))",
          maxWidth: "calc(100vw - 32px)",
        };
    }
  };

  const modalWidth = getModalWidthStyle(widthMode);

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => !data.open && onClose()}
      surfaceMotion={surfaceMotion}
    >
      <DialogSurface
        className="reader-modal-surface"
        backdropMotion={backdropMotion}
        backdrop={{
          style: {
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
        }}
        style={{
          ...modalWidth,
          position: isNarrowScreen ? "fixed" : undefined,
          inset: isNarrowScreen ? 0 : undefined,
          top: isNarrowScreen ? 0 : undefined,
          left: isNarrowScreen ? 0 : undefined,
          right: isNarrowScreen ? 0 : undefined,
          bottom: isNarrowScreen ? 0 : undefined,
          margin: isNarrowScreen ? 0 : undefined,
          zIndex: isNarrowScreen ? 2000 : undefined,
          width: isNarrowScreen ? "100vw" : modalWidth.width,
          minWidth: isNarrowScreen ? "100vw" : undefined,
          maxWidth: isNarrowScreen ? "100vw" : modalWidth.maxWidth,
          maxHeight: isNarrowScreen ? "100dvh" : "88vh",
          height: isNarrowScreen ? "100dvh" : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: isNarrowScreen ? 0 : "16px",
          border: isNarrowScreen ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)"),
          padding: isNarrowScreen ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : "24px 28px",
          backgroundColor: isDark ? "#1c1c23" : "#ffffff",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: isNarrowScreen
            ? "none"
            : (isDark
              ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
              : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)"),
        }}
      >
        <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", height: "100%" }}>
          {/* 固定 Header：包含第 1 行标题与关闭/分享按钮，第 2 行时间、心境、天气与页宽控制 */}
          <header className="reader-modal-header" style={{ flexShrink: 0, width: "100%" }}>
            {/* Header Row 1: 顶部标题栏 (靠左) 与 分享、关闭按钮 (靠右) */}
            <div
              className="dialog-header-top-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                width: "100%",
              }}
            >
              <DialogTitle style={{ padding: 0, margin: 0, flex: 1, minWidth: 0 }}>
                <Title3
                  className="dialog-title-text"
                  style={{
                    fontWeight: 700,
                    fontSize: "20px",
                    letterSpacing: "-0.3px",
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                    margin: 0,
                    display: "block",
                  }}
                >
                  {currentDiary.title || "无标题日记"}
                </Title3>
              </DialogTitle>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <Tooltip content={copiedLink ? "链接已复制" : "复制链接"} relationship="label">
                  <Button
                    className="dialog-share-btn"
                    appearance="subtle"
                    icon={copiedLink ? <Checkmark20Regular style={{ color: "#107c41" }} /> : <Share20Regular />}
                    onClick={handleCopyLink}
                    aria-label="分享"
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

            {/* Header Row 2: 天气和心情单纯图标 (hover显示文字) 与时间 (靠左) + 宽度控制按钮 (靠右) */}
            <div
              className="dialog-header-meta-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                width: "100%",
                marginTop: "10px",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
              }}
            >
              {/* 靠左：单纯图标的天气与心情（hover 显示文字 Tooltip）+ 记录时间 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {(currentDiary.nickname || currentDiary.username) && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginRight: "4px",
                    }}
                  >
                    <Avatar
                      size={20}
                      image={currentDiary.avatar ? { src: currentDiary.avatar } : undefined}
                      aria-label={currentDiary.nickname || currentDiary.username}
                      color="brand"
                    />
                    <span style={{ fontSize: "12px", fontWeight: 600, opacity: isDark ? 0.9 : 0.85 }}>
                      {currentDiary.nickname || currentDiary.username}
                    </span>
                  </div>
                )}
                <WeatherIcon weather={currentDiary.weather} size={18} />
                <MoodIcon mood={currentDiary.mood} size={18} />
                <span
                  style={{
                    fontSize: "12px",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                    color: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {formatDate(currentDiary.created_at)}
                </span>
              </div>

              {/* 靠右：宽度控制按钮 (三挡，窄屏全屏模式下自动隐藏) */}
              <div
                className="reader-width-switcher reader-width-toolbar"
                role="group"
                aria-label="调整预览宽度"
                style={{
                  flexShrink: 0,
                  display: isNarrowScreen ? "none" : undefined,
                }}
              >
                <Tooltip content="默认宽度" relationship="label">
                  <button
                    type="button"
                    className={`reader-width-btn ${widthMode === "default" ? "active" : ""}`}
                    onClick={() => handleSetWidthMode("default")}
                    aria-pressed={widthMode === "default"}
                  >
                    <SlideGrid20Regular style={{ fontSize: "15px" }} />
                    <span>默认</span>
                  </button>
                </Tooltip>

                <Tooltip content="更宽视窗" relationship="label">
                  <button
                    type="button"
                    className={`reader-width-btn ${widthMode === "wider" ? "active" : ""}`}
                    onClick={() => handleSetWidthMode("wider")}
                    aria-pressed={widthMode === "wider"}
                  >
                    <ColumnTriple20Regular style={{ fontSize: "15px" }} />
                    <span>更宽</span>
                  </button>
                </Tooltip>

                <Tooltip content="全宽视窗" relationship="label">
                  <button
                    type="button"
                    className={`reader-width-btn ${widthMode === "full" ? "active" : ""}`}
                    onClick={() => handleSetWidthMode("full")}
                    aria-pressed={widthMode === "full"}
                  >
                    <FullScreenMaximize20Regular style={{ fontSize: "15px" }} />
                    <span>全宽</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </header>

          {/* Markdown Content Area：纵向溢出独立滚动 */}
          <DialogContent
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              margin: 0,
              padding: "6px 12px 12px 6px",
              boxSizing: "border-box",
            }}
          >
            <MarkdownViewer content={currentDiary.content} />
          </DialogContent>

          {/* Footer Actions：固定在底部 */}
          <footer className="reader-modal-footer" style={{ flexShrink: 0, width: "100%" }}>
            <DialogActions
              style={{
                marginTop: "16px",
                padding: 0,
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              {isOwner && onEdit && (
                <Button
                  appearance="primary"
                  icon={<Edit20Regular />}
                  onClick={() => {
                    onClose();
                    onEdit(currentDiary);
                  }}
                  style={{
                    backgroundColor: "#5B7B8D",
                    fontWeight: 600,
                  }}
                >
                  编辑
                </Button>
              )}
              <Button appearance="secondary" onClick={onClose}>
                关闭
              </Button>
            </DialogActions>
          </footer>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
