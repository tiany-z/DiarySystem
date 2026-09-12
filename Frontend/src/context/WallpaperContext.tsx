import React, { createContext, useContext, useEffect, useState } from "react";
import { wallpaperApi, WallpaperItem } from "../api/wallpaper";

interface WallpaperSettings {
  enabled: boolean;
  blur: number; // 0 ~ 30
  opacity: number; // 0.10 ~ 0.85
  currentIndex: number;
}

const STORAGE_KEY = "diary_wallpaper_settings_v2";

const DEFAULT_SETTINGS: WallpaperSettings = {
  enabled: true,
  blur: 8,
  opacity: 0.35,
  currentIndex: 0,
};

const DEFAULT_WALLPAPERS: WallpaperItem[] = [
  {
    url: "https://bing.biturl.top/?resolution=1920&format=image&index=0",
    title: "今日微软必应壁纸",
    copyright: "Microsoft Bing Daily Wallpaper",
  },
  {
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop",
    title: "雷尼尔雪山与静谧湖泊",
    copyright: "Mount Rainier National Park",
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop",
    title: "晨曦染金的雪峰群山",
    copyright: "Alpine Sunrise Panorama",
  },
  {
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop",
    title: "薄雾深林与晨光微曦",
    copyright: "Mystic Forest in Morning Mist",
  },
];

interface WallpaperContextType {
  enabled: boolean;
  blur: number;
  opacity: number;
  wallpapers: WallpaperItem[];
  currentIndex: number;
  currentWallpaper: WallpaperItem | null;
  isLoading: boolean;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setBlur: (blur: number) => void;
  setOpacity: (opacity: number) => void;
  setCurrentIndex: (index: number) => void;
  nextWallpaper: () => void;
  prevWallpaper: () => void;
  refresh: () => Promise<void>;
  resetSettings: () => void;
}

const WallpaperContext = createContext<WallpaperContextType | null>(null);

export const WallpaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从 LocalStorage 读取初始设置
  const [settings, setSettings] = useState<WallpaperSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>(DEFAULT_WALLPAPERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 持久化设置
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // 从后端获取壁纸数据
  const fetchWallpapers = async () => {
    setIsLoading(true);
    try {
      const res = await wallpaperApi.getBingWallpapers();
      if (res.status === 1 && res.data && res.data.wallpapers && res.data.wallpapers.length > 0) {
        setWallpapers(res.data.wallpapers);
      }
    } catch {
      // 保持兜底列表
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallpapers();
  }, []);

  const currentWallpaper =
    wallpapers.length > 0
      ? wallpapers[Math.min(settings.currentIndex, wallpapers.length - 1)] || wallpapers[0]
      : null;

  // 动态同步 body 类名，方便 CSS 为有壁纸状态做微调
  useEffect(() => {
    if (settings.enabled && currentWallpaper) {
      document.body.classList.add("has-wallpaper-active");
    } else {
      document.body.classList.remove("has-wallpaper-active");
    }
  }, [settings.enabled, currentWallpaper]);

  const setEnabled = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enabled }));
  };

  const setBlur = (blur: number) => {
    setSettings((prev) => ({ ...prev, blur }));
  };

  const setOpacity = (opacity: number) => {
    setSettings((prev) => ({ ...prev, opacity }));
  };

  const setCurrentIndex = (currentIndex: number) => {
    setSettings((prev) => ({ ...prev, currentIndex }));
  };

  const nextWallpaper = () => {
    if (wallpapers.length === 0) return;
    setSettings((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % wallpapers.length,
    }));
  };

  const prevWallpaper = () => {
    if (wallpapers.length === 0) return;
    setSettings((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + wallpapers.length) % wallpapers.length,
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <WallpaperContext.Provider
      value={{
        enabled: settings.enabled,
        blur: settings.blur,
        opacity: settings.opacity,
        wallpapers,
        currentIndex: settings.currentIndex,
        currentWallpaper,
        isLoading,
        isSettingsOpen,
        setIsSettingsOpen,
        setEnabled,
        setBlur,
        setOpacity,
        setCurrentIndex,
        nextWallpaper,
        prevWallpaper,
        refresh: fetchWallpapers,
        resetSettings,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
};

export const useWallpaper = () => {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error("useWallpaper must be used within a WallpaperProvider");
  }
  return context;
};
