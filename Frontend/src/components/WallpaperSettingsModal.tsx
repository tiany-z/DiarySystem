import React, { useState } from "react";
import {
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Slider,
  Spinner,
  Switch,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  ArrowRight20Regular,
  ArrowSync20Regular,
  Checkmark20Regular,
  Dismiss20Regular,
  Image20Regular,
  Save20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { useAuth } from "../context/AuthContext";
import { useAppTheme } from "../context/ThemeContext";
import { useWallpaper } from "../context/WallpaperContext";
import { useAppDialogMotion } from "../utils/dialogMotion";

export const WallpaperSettingsModal: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { surfaceMotion, backdropMotion, isMobile } = useAppDialogMotion();
  const {
    enabled,
    blur,
    opacity,
    currentWallpaper,
    wallpapers,
    currentIndex,
    isSettingsOpen,
    isLoading,
    isSaving,
    setIsSettingsOpen,
    setEnabled,
    setBlur,
    setOpacity,
    nextWallpaper,
    prevWallpaper,
    refresh,
    resetSettings,
    saveToDatabase,
  } = useWallpaper();

  const isTiany = user?.username === "tiany";
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleSaveToDatabase = async () => {
    if (!isTiany) return;
    setSaveStatus("idle");
    const ok = await saveToDatabase();
    if (ok) {
      setSaveStatus("success");
      setSaveMsg("背景设置已保存");
      setTimeout(() => {
        setSaveMsg(null);
        setSaveStatus("idle");
      }, 2500);
    } else {
      setSaveStatus("error");
      setSaveMsg("保存失败，请检查网络");
      setTimeout(() => {
        setSaveMsg(null);
        setSaveStatus("idle");
      }, 3000);
    }
  };

  return (
    <Dialog
      open={isSettingsOpen}
      onOpenChange={(_, data) => !data.open && setIsSettingsOpen(false)}
      surfaceMotion={surfaceMotion}
    >
      <DialogSurface
        backdropMotion={backdropMotion}
        backdrop={{
          style: {
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
          },
        }}
        style={{
          position: isMobile ? "fixed" : undefined,
          inset: isMobile ? 0 : undefined,
          top: isMobile ? 0 : undefined,
          left: isMobile ? 0 : undefined,
          right: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          margin: isMobile ? 0 : undefined,
          zIndex: isMobile ? 2000 : undefined,
          maxWidth: isMobile ? "100vw" : "490px",
          minWidth: isMobile ? "100vw" : undefined,
          width: isMobile ? "100vw" : "90vw",
          maxHeight: isMobile ? "100dvh" : "88vh",
          height: isMobile ? "100dvh" : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: isMobile ? 0 : "16px",
          padding: isMobile ? "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)) 16px" : "24px",
          backgroundColor: isDark ? "#1c1c23" : "#ffffff",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          border: isMobile ? "none" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)"),
          boxShadow: isMobile
            ? "none"
            : (isDark
              ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
              : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)"),
        }}
      >
        <DialogBody style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%" }}>
          {/* Title Header - 固定顶部 */}
          <header className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "14px", flexShrink: 0 }}>
            <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
              <DialogTitle style={{ padding: 0, margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Image20Regular style={{ color: "#5B7B8D" }} />
                  <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>
                    背景设置
                  </Title3>
                </div>
              </DialogTitle>
            </div>
            <Tooltip content="关闭" relationship="label">
              <Button
                className="dialog-close-btn"
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={() => setIsSettingsOpen(false)}
                aria-label="关闭"
                style={{ marginLeft: "auto", flexShrink: 0 }}
              />
            </Tooltip>
          </header>

          <DialogContent style={{ display: "flex", flexDirection: "column", gap: "18px", padding: 0, flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>

            {/* Enable Bing Wallpaper Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "8px",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                opacity: isTiany ? 1 : 0.75,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkle20Regular style={{ color: "#5B7B8D", fontSize: "16px" }} />
                  动态壁纸
                </div>
                <Caption1 style={{ opacity: 0.65, fontSize: "12px" }}>
                  开启后显示背景壁纸
                </Caption1>
              </div>
              <Switch
                checked={enabled}
                disabled={!isTiany}
                onChange={(_, data) => setEnabled(data.checked)}
              />
            </div>

            {/* Current Wallpaper Preview & Switcher */}
            {enabled && (
              <>
                {currentWallpaper && (
                  <div
                    style={{
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                      flexShrink: 0,
                    }}
                  >
                    {/* Thumbnail - 固定高度与防挤压 */}
                    <div
                      style={{
                        height: "140px",
                        minHeight: "140px",
                        maxHeight: "140px",
                        flexShrink: 0,
                        position: "relative",
                        backgroundImage: `url("${currentWallpaper.base64 || currentWallpaper.url}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center center",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "10px 12px 6px 12px",
                          background: "linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%)",
                          color: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 600,
                            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {currentWallpaper.title}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            opacity: 0.8,
                            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {currentWallpaper.copyright}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Controller */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        backgroundColor: isDark ? "rgba(31, 31, 38, 0.9)" : "rgba(248, 250, 252, 0.9)",
                        flexShrink: 0,
                      }}
                    >
                      <Caption1 style={{ opacity: 0.75, fontWeight: 500 }}>
                        {currentIndex + 1} / {wallpapers.length}
                      </Caption1>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Tooltip content={isTiany ? "上一张" : "仅管理员可切换"} relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowLeft20Regular />}
                            onClick={prevWallpaper}
                            disabled={!isTiany}
                            aria-label="上一张壁纸"
                          />
                        </Tooltip>
                        <Tooltip content={isTiany ? "下一张" : "仅管理员可切换"} relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowRight20Regular />}
                            onClick={nextWallpaper}
                            disabled={!isTiany}
                            aria-label="下一张壁纸"
                          />
                        </Tooltip>
                        <Tooltip content={isTiany ? "刷新壁纸库" : "仅管理员可刷新"} relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowSync20Regular />}
                            onClick={refresh}
                            disabled={!isTiany || isLoading}
                            aria-label="刷新壁纸库"
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blur Slider */}
                <div style={{ opacity: isTiany ? 1 : 0.75, flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <Body1 style={{ fontWeight: 600, fontSize: "13px" }}>背景模糊度</Body1>
                    <Caption1 style={{ fontWeight: 600, color: "#5B7B8D" }}>
                      {blur} px
                    </Caption1>
                  </div>
                  <Slider
                    min={0}
                    max={30}
                    value={blur}
                    disabled={!isTiany}
                    onChange={(_, data) => setBlur(Math.round(data.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <Caption1 style={{ opacity: 0.5, fontSize: "11px" }}>0px</Caption1>
                    <Caption1 style={{ opacity: 0.5, fontSize: "11px" }}>30px</Caption1>
                  </div>
                </div>

                {/* Mask Opacity Slider */}
                <div style={{ opacity: isTiany ? 1 : 0.75, flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <Body1 style={{ fontWeight: 600, fontSize: "13px" }}>遮罩浓度</Body1>
                    <Caption1 style={{ fontWeight: 600, color: "#5B7B8D" }}>
                      {Math.round(opacity * 100)} %
                    </Caption1>
                  </div>
                  <Slider
                    min={10}
                    max={85}
                    value={Math.round(opacity * 100)}
                    disabled={!isTiany}
                    onChange={(_, data) => setOpacity(Math.round(data.value) / 100)}
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <Caption1 style={{ opacity: 0.5, fontSize: "11px" }}>10%</Caption1>
                    <Caption1 style={{ opacity: 0.5, fontSize: "11px" }}>85%</Caption1>
                  </div>
                </div>
              </>
            )}


            {/* 保存状态通知 */}
            {saveMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: saveStatus === "success"
                    ? (isDark ? "rgba(16, 124, 65, 0.2)" : "rgba(16, 124, 65, 0.1)")
                    : (isDark ? "rgba(209, 52, 56, 0.2)" : "rgba(209, 52, 56, 0.1)"),
                  border: `1px solid ${saveStatus === "success" ? "#107c41" : "#d13438"}`,
                  color: saveStatus === "success" ? (isDark ? "#54b054" : "#107c41") : "#d13438",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {saveStatus === "success" ? <Checkmark20Regular /> : null}
                <span>{saveMsg}</span>
              </div>
            )}
          </DialogContent>

          {/* Footer Actions - 固定底部 */}
          <footer className="dialog-footer-row" style={{ flexShrink: 0, width: "100%" }}>
            <DialogActions style={{ justifyContent: "space-between", marginTop: "20px", padding: 0, flexShrink: 0 }}>
              {isTiany ? (
                <>
                  <Button
                    appearance="subtle"
                    disabled={isSaving}
                    onClick={() => {
                      resetSettings();
                    }}
                  >
                    恢复默认
                  </Button>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Button
                      appearance="primary"
                      icon={isSaving ? <Spinner size="tiny" /> : <Save20Regular />}
                      disabled={isSaving}
                      onClick={handleSaveToDatabase}
                      style={{
                        backgroundColor: "#5B7B8D",
                        fontWeight: 600,
                      }}
                    >
                      {isSaving ? "正在保存..." : "保存设置"}
                    </Button>
                    <Button appearance="secondary" onClick={() => setIsSettingsOpen(false)}>
                      完成
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div />
                  <Button
                    appearance="primary"
                    onClick={() => setIsSettingsOpen(false)}
                    style={{
                      backgroundColor: "#5B7B8D",
                      fontWeight: 600,
                    }}
                  >
                    完成
                  </Button>
                </>
              )}
            </DialogActions>
          </footer>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
