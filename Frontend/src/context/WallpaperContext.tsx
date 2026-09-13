import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { wallpaperApi, WallpaperItem } from "../api/wallpaper";

interface WallpaperSettings {
  enabled: boolean;
  blur: number; // 0 ~ 30
  opacity: number; // 0.10 ~ 0.85
  currentIndex: number;
  selectedWallpaperUrl?: string;
}

const STORAGE_KEY = "diary_wallpaper_settings_v3";

const DEFAULT_SETTINGS: WallpaperSettings = {
  enabled: true,
  blur: 12,
  opacity: 0.4,
  currentIndex: 1,
  selectedWallpaperUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop",
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
  isSaving: boolean;
  isSettingsLoaded: boolean;
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
  saveToDatabase: () => Promise<boolean>;
}

const WallpaperContext = createContext<WallpaperContextType | null>(null);

export const WallpaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从 LocalStorage 读取初始快照 (保障首屏极速秒开零闪烁)
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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // 本地缓存持久化 (作为前端秒开快照)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // 从后端 MySQL 数据库拉取管理员 tiany 的权威全局背景设置
  const fetchSystemSettings = async () => {
    try {
      const res = await wallpaperApi.getSystemWallpaperSettings();
      if (res.status === 1 && res.data) {
        const sys = res.data;
        setSettings((prev) => ({
          ...prev,
          enabled: sys.enabled,
          blur: sys.blur,
          opacity: sys.opacity,
          currentIndex: sys.currentIndex !== undefined ? sys.currentIndex : prev.currentIndex,
          selectedWallpaperUrl: sys.selectedWallpaperUrl || prev.selectedWallpaperUrl,
        }));
      }
    } catch {
      // 保持当前快照
    } finally {
      setIsSettingsLoaded(true);
    }
  };

  // 从后端获取壁纸数据
  const fetchWallpapers = async () => {
    setIsLoading(true);
    try {
      const res = await wallpaperApi.getBingWallpapers();
      if (res.status === 1 && res.data && res.data.wallpapers && res.data.wallpapers.length > 0) {
        // 合并必应每日壁纸与默认精选壁纸，避免精选壁纸丢失
        const bingList: WallpaperItem[] = res.data.wallpapers;
        const merged: WallpaperItem[] = [...bingList];
        DEFAULT_WALLPAPERS.forEach((dw) => {
          if (!merged.some((w) => w.url === dw.url)) {
            merged.push(dw);
          }
        });
        setWallpapers(merged);
      }
    } catch {
      // 保持兜底列表
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 首屏同时发起：从数据库加载 tiany 的全局设置以及精选壁纸库
    fetchSystemSettings();
    fetchWallpapers();
  }, []);

  // 综合计算当前壁纸：必须等待权威设置就绪，绝不提前展示临时第 1 张图；且以权威 selectedWallpaperUrl 为准
  const currentWallpaper = useMemo(() => {
    if (!isSettingsLoaded) return null;
    if (wallpapers.length === 0) return null;
    if (settings.selectedWallpaperUrl) {
      const found = wallpapers.find((w) => w.url === settings.selectedWallpaperUrl);
      if (found) return found;
      return {
        url: settings.selectedWallpaperUrl,
        title: "系统背景壁纸",
        copyright: "System Wallpaper",
      };
    }
    const idx = Math.min(Math.max(0, settings.currentIndex), wallpapers.length - 1);
    return wallpapers[idx] || wallpapers[0];
  }, [isSettingsLoaded, wallpapers, settings.currentIndex, settings.selectedWallpaperUrl]);

  // 动态同步 html 与 body 类名，方便 CSS 为有壁纸状态做微调
  useEffect(() => {
    if (settings.enabled && currentWallpaper && isSettingsLoaded) {
      document.documentElement.classList.add("has-wallpaper-active");
      document.body.classList.add("has-wallpaper-active");
    } else {
      document.documentElement.classList.remove("has-wallpaper-active");
      document.body.classList.remove("has-wallpaper-active");
    }
  }, [settings.enabled, currentWallpaper, isSettingsLoaded]);

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
    setSettings((prev) => ({
      ...prev,
      currentIndex,
      selectedWallpaperUrl: wallpapers[currentIndex]?.url || prev.selectedWallpaperUrl,
    }));
  };

  const nextWallpaper = () => {
    if (wallpapers.length === 0) return;
    setSettings((prev) => {
      const nextIdx = (prev.currentIndex + 1) % wallpapers.length;
      return {
        ...prev,
        currentIndex: nextIdx,
        selectedWallpaperUrl: wallpapers[nextIdx]?.url,
      };
    });
  };

  const prevWallpaper = () => {
    if (wallpapers.length === 0) return;
    setSettings((prev) => {
      const prevIdx = (prev.currentIndex - 1 + wallpapers.length) % wallpapers.length;
      return {
        ...prev,
        currentIndex: prevIdx,
        selectedWallpaperUrl: wallpapers[prevIdx]?.url,
      };
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // 由管理员 tiany 触发将当前调制的视觉效果持久化保存至 MySQL 数据库
  const saveToDatabase = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const res = await wallpaperApi.saveSystemWallpaperSettings({
        enabled: settings.enabled,
        blur: settings.blur,
        opacity: settings.opacity,
        currentIndex: settings.currentIndex,
        selectedWallpaperUrl: currentWallpaper?.url || DEFAULT_SETTINGS.selectedWallpaperUrl,
        title: currentWallpaper?.title,
        copyright: currentWallpaper?.copyright,
      });
      return res.status === 1;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
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
        isSaving,
        isSettingsLoaded,
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
        saveToDatabase,
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
