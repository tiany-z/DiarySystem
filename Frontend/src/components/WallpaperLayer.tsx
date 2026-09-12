import React from "react";
import { useAppTheme } from "../context/ThemeContext";
import { useWallpaper } from "../context/WallpaperContext";

export const WallpaperLayer: React.FC = () => {
  const { enabled, blur, opacity, currentWallpaper } = useWallpaper();
  const { isDark } = useAppTheme();

  if (!enabled || !currentWallpaper) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* High-Resolution Bing Wallpaper Canvas */}
      <div
        style={{
          position: "absolute",
          top: "-24px",
          left: "-24px",
          right: "-24px",
          bottom: "-24px",
          backgroundImage: `url("${currentWallpaper.url}")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          filter: `blur(${blur}px)`,
          transform: "scale(1.06)",
          transition: "filter 0.25s ease, background-image 0.5s ease",
        }}
      />

      {/* Adaptive Theme Blur Mask Overlay */}
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
