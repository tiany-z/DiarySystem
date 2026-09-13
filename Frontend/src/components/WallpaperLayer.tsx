import React, { useEffect, useState } from "react";
import { useAppTheme } from "../context/ThemeContext";
import { useWallpaper } from "../context/WallpaperContext";
import { extractImageCompositeColor } from "../utils/wallpaperColor";

export const WallpaperLayer: React.FC = () => {
  const { enabled, blur, opacity, currentWallpaper, isSettingsLoaded } = useWallpaper();
  const { isDark } = useAppTheme();

  // 当前活跃的背景图与过渡中的进场图（双图层 GPU 透明度交叉渐变，杜绝 CSS background-image 变形拉伸）
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  const [incomingOpacity, setIncomingOpacity] = useState<number>(0);
  const [isLayerVisible, setIsLayerVisible] = useState<boolean>(false);

  useEffect(() => {
    // 只有在全局配置已启用、设置已从数据库确立、且具有权威壁纸 URL 时才开始加载
    if (!enabled || !isSettingsLoaded || !currentWallpaper?.url) {
      return;
    }

    const targetUrl = currentWallpaper.url;

    // 1. 首屏首次加载：确保从纯色平滑淡入到当前应该显示的权威图，绝不提前展示第一张临时图
    if (!activeUrl) {
      let active = true;
      const img = new Image();
      img.src = targetUrl;
      const onReady = () => {
        if (!active) return;
        setActiveUrl(targetUrl);
        // 下一帧以微阻尼渐入展现
        requestAnimationFrame(() => {
          setIsLayerVisible(true);
        });
      };
      if (img.complete) {
        onReady();
      } else {
        img.onload = onReady;
        img.onerror = onReady;
      }
      return () => {
        active = false;
      };
    }

    // 2. 后续切换壁纸（例如设置面板中切换）：双图层交叉渐变，无任何拉伸形变
    if (targetUrl !== activeUrl && targetUrl !== incomingUrl) {
      let active = true;
      const img = new Image();
      img.src = targetUrl;
      const onIncomingReady = () => {
        if (!active) return;
        setIncomingUrl(targetUrl);
        setIncomingOpacity(0);
        requestAnimationFrame(() => {
          setIncomingOpacity(1);
        });
      };
      if (img.complete) {
        onIncomingReady();
      } else {
        img.onload = onIncomingReady;
        img.onerror = onIncomingReady;
      }
      return () => {
        active = false;
      };
    }
  }, [enabled, isSettingsLoaded, currentWallpaper?.url, activeUrl, incomingUrl]);

  // 新图渐变完成晋升为 activeUrl
  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === "opacity" && incomingUrl && incomingOpacity === 1) {
      setActiveUrl(incomingUrl);
      setIncomingUrl(null);
      setIncomingOpacity(0);
    }
  };

  // 动态提取当前活跃壁纸图片的综合颜色，以 20% 透明度注入全站文本选中背景底色 (--selection-bg)
  // 若未开启壁纸或未加载图片，则移除内联变量，由 CSS 自动使用浅色模式 20% 黑色 / 深色模式 20% 白色
  useEffect(() => {
    if (!enabled || !isSettingsLoaded || !activeUrl) {
      document.documentElement.style.removeProperty("--selection-bg");
      return;
    }

    let active = true;
    extractImageCompositeColor(activeUrl).then(([r, g, b]) => {
      if (!active) return;
      document.documentElement.style.setProperty(
        "--selection-bg",
        `rgba(${r}, ${g}, ${b}, 0.2)`
      );
    });

    return () => {
      active = false;
      document.documentElement.style.removeProperty("--selection-bg");
    };
  }, [enabled, isSettingsLoaded, activeUrl]);

  // 未就绪或禁用时直接返回 null，露出纯正深色/浅色背景，绝不闪现任何第一张图
  if (!enabled || !isSettingsLoaded || !activeUrl) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: isLayerVisible ? 1 : 0,
        transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* 基础活跃图层 (Active Wallpaper Canvas) */}
      <div
        style={{
          position: "absolute",
          top: "-24px",
          left: "-24px",
          right: "-24px",
          bottom: "-24px",
          backgroundImage: `url("${activeUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          filter: `blur(${blur}px)`,
          transform: "scale(1.06)",
        }}
      />

      {/* 进场交叉渐变图层 (Incoming Crossfade Layer) - 仅在切换壁纸时平滑淡入，完全杜绝 background-image 变形 */}
      {incomingUrl && (
        <div
          onTransitionEnd={handleTransitionEnd}
          style={{
            position: "absolute",
            top: "-24px",
            left: "-24px",
            right: "-24px",
            bottom: "-24px",
            backgroundImage: `url("${incomingUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            filter: `blur(${blur}px)`,
            transform: "scale(1.06)",
            opacity: incomingOpacity,
            transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      )}

      {/* 自适应毛玻璃遮罩层 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: isDark
            ? `rgba(18, 18, 24, ${opacity})`
            : `rgba(248, 250, 252, ${opacity})`,
          transition: "background-color 0.25s ease",
        }}
      />
    </div>
  );
};
