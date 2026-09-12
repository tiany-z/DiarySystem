import React from "react";
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
  Switch,
  Title3,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  ArrowRight20Regular,
  ArrowSync20Regular,
  Dismiss20Regular,
  Image20Regular,
  Sparkle20Regular,
} from "@fluentui/react-icons";
import { useAppTheme } from "../context/ThemeContext";
import { useWallpaper } from "../context/WallpaperContext";

export const WallpaperSettingsModal: React.FC = () => {
  const { isDark } = useAppTheme();
  const {
    enabled,
    blur,
    opacity,
    currentWallpaper,
    wallpapers,
    currentIndex,
    isSettingsOpen,
    isLoading,
    setIsSettingsOpen,
    setEnabled,
    setBlur,
    setOpacity,
    nextWallpaper,
    prevWallpaper,
    refresh,
    resetSettings,
  } = useWallpaper();

  return (
    <Dialog open={isSettingsOpen} onOpenChange={(_, data) => !data.open && setIsSettingsOpen(false)}>
      <DialogSurface
        backdrop={{
          style: {
            backdropFilter: "blur(12px) saturate(135%)",
            WebkitBackdropFilter: "blur(12px) saturate(135%)",
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(15, 23, 42, 0.4)",
          },
        }}
        style={{
          maxWidth: "480px",
          width: "90vw",
          borderRadius: "16px",
          padding: "24px",
          backgroundColor: isDark ? "rgba(28, 28, 35, 0.95)" : "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow: isDark
            ? "0 28px 72px rgba(0, 0, 0, 0.65), 0 6px 24px rgba(0, 0, 0, 0.4)"
            : "0 24px 64px rgba(0, 0, 0, 0.22), 0 4px 18px rgba(0, 0, 0, 0.08)",
        }}
      >
        <DialogBody style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {/* Title Header */}
          <div className="dialog-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "16px" }}>
            <div className="dialog-header-title" style={{ flex: 1, minWidth: 0 }}>
              <DialogTitle style={{ padding: 0, margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Image20Regular style={{ color: "#0078d4" }} />
                  <Title3 style={{ fontWeight: 600, fontSize: "18px" }}>
                    壁纸与背景
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
          </div>

          <DialogContent style={{ display: "flex", flexDirection: "column", gap: "20px", padding: 0 }}>
            {/* Enable Bing Wallpaper Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: "8px",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkle20Regular style={{ color: "#0078d4", fontSize: "16px" }} />
                  必应每日壁纸
                </div>
                <Caption1 style={{ opacity: 0.65, fontSize: "12px" }}>
                  每日精选自然风光与动态毛玻璃质感
                </Caption1>
              </div>
              <Switch checked={enabled} onChange={(_, data) => setEnabled(data.checked)} />
            </div>

            {enabled && (
              <>
                {/* Wallpaper Preview Card */}
                {currentWallpaper && (
                  <div
                    style={{
                      borderRadius: "10px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        height: "125px",
                        backgroundImage: `url("${currentWallpaper.url}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "8px 12px",
                          background: "linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, transparent 100%)",
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
                      }}
                    >
                      <Caption1 style={{ opacity: 0.75, fontWeight: 500 }}>
                        {currentIndex + 1} / {wallpapers.length}
                      </Caption1>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Tooltip content="上一张" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowLeft20Regular />}
                            onClick={prevWallpaper}
                            aria-label="上一张壁纸"
                          />
                        </Tooltip>
                        <Tooltip content="下一张" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowRight20Regular />}
                            onClick={nextWallpaper}
                            aria-label="下一张壁纸"
                          />
                        </Tooltip>
                        <Tooltip content="刷新壁纸库" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowSync20Regular />}
                            onClick={refresh}
                            disabled={isLoading}
                            aria-label="刷新壁纸库"
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blur Slider - 平滑纯净无多余刻度节段 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <Body1 style={{ fontWeight: 600, fontSize: "13px" }}>背景模糊度</Body1>
                    <Caption1 style={{ fontWeight: 600, color: "#0078d4" }}>
                      {blur} px
                    </Caption1>
                  </div>
                  <Slider
                    min={0}
                    max={30}
                    value={blur}
                    onChange={(_, data) => setBlur(Math.round(data.value))}
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <Caption1 style={{ opacity: 0.5, fontSize: "11px" }}>0px</Caption1>
                    <Caption1 style={{ opacity: 0.5, fontSize: "11px" }}>30px</Caption1>
                  </div>
                </div>

                {/* Mask Opacity Slider - 平滑纯净无多余刻度节段 */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <Body1 style={{ fontWeight: 600, fontSize: "13px" }}>遮罩浓度</Body1>
                    <Caption1 style={{ fontWeight: 600, color: "#0078d4" }}>
                      {Math.round(opacity * 100)} %
                    </Caption1>
                  </div>
                  <Slider
                    min={10}
                    max={85}
                    value={Math.round(opacity * 100)}
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
          </DialogContent>

          {/* Footer Actions - 原生 Fluent 2 按钮，无多余分割线 */}
          <DialogActions style={{ justifyContent: "space-between", marginTop: "24px", padding: 0 }}>
            <Button appearance="subtle" onClick={resetSettings}>
              恢复默认
            </Button>
            <Button appearance="primary" onClick={() => setIsSettingsOpen(false)}>
              完成
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

