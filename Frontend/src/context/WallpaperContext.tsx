import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { wallpaperApi, WallpaperItem } from "../api/wallpaper";
import {
  getStoredBingWallpaper,
  saveStoredBingWallpaper,
  getFastStoredBingWallpaper,
  fetchImageAsBase64,
  isBingWallpaper,
  isSameBingWallpaper,
  StoredBingWallpaper,
} from "../utils/wallpaperStorage";

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
  currentIndex: 0,
  selectedWallpaperUrl: "https://bing.biturl.top/?resolution=1920&format=image&index=0",
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

  // 从本地快照同步初始化壁纸列表，若有 Base64 缓存则直接在第 0 毫秒注入，保障首屏瞬间直显
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>(() => {
    const fast = getFastStoredBingWallpaper();
    if (fast && fast.base64) {
      return DEFAULT_WALLPAPERS.map((w, idx) => {
        if (idx === 0 || isSameBingWallpaper(w.url, fast.url)) {
          return {
            ...w,
            url: fast.url,
            base64: fast.base64,
            title: fast.title || w.title,
            copyright: fast.copyright || w.copyright,
          };
        }
        return w;
      });
    }
    return DEFAULT_WALLPAPERS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  // 从本地低级数据库 (IndexedDB) 加载的 Bing 壁纸 Base64 缓存，优先采用 0ms 同步快照直出
  const [cachedBingRecord, setCachedBingRecord] = useState<StoredBingWallpaper | null>(() => {
    return getFastStoredBingWallpaper();
  });

  // 引用追踪最新 settings 与 wallpapers，避免定时器与异步任务闭包陈旧
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const wallpapersRef = useRef(wallpapers);
  wallpapersRef.current = wallpapers;

  // 本地缓存持久化 (作为前端秒开快照)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // 1. 优先从本地低级数据库 (IndexedDB) 读取上一次的 Bing 壁纸 Base64 (首屏极速秒开直显)
  useEffect(() => {
    let active = true;
    getStoredBingWallpaper().then((stored) => {
      if (!active || !stored) return;
      console.log("[WallpaperStorage] 成功从 IndexedDB 低级数据库加载上次 Bing 壁纸 Base64:", stored.title);
      setCachedBingRecord(stored);

      // 如果当前列表有默认 Bing 条目，赋予其 Base64 预加载值
      setWallpapers((prev) => {
        return prev.map((w, idx) => {
          if (idx === 0 || isSameBingWallpaper(w.url, stored.url)) {
            return {
              ...w,
              url: stored.url,
              base64: stored.base64,
              title: stored.title || w.title,
              copyright: stored.copyright || w.copyright,
            };
          }
          return w;
        });
      });
    });

    return () => {
      active = false;
    };
  }, []);

  // 2. 从后端 MySQL 数据库拉取管理员的全局背景设置
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

  // 3. 从后端获取最新 Bing 壁纸列表并进行过期检测
  const fetchWallpapersAndCheckRotation = async () => {
    setIsLoading(true);
    try {
      const res = await wallpaperApi.getBingWallpapers();
      if (res.status === 1 && res.data && res.data.wallpapers && res.data.wallpapers.length > 0) {
        const bingList: WallpaperItem[] = res.data.wallpapers;

        // 合并必应每日壁纸与默认精选壁纸，避免精选壁纸丢失
        setWallpapers((prev) => {
          const merged: WallpaperItem[] = [...bingList];
          DEFAULT_WALLPAPERS.forEach((dw) => {
            if (!merged.some((w) => w.url === dw.url)) {
              merged.push(dw);
            }
          });
          return merged;
        });

        // 核心逻辑：比对当前壁纸是否仍在“允许选择的 Bing 图片集合”当中
        const currentSettings = settingsRef.current;
        const currentUrl =
          currentSettings.selectedWallpaperUrl ||
          wallpapersRef.current[currentSettings.currentIndex]?.url ||
          "";
        const isCurrentBing =
          isBingWallpaper(currentUrl) || currentSettings.currentIndex === 0;

        if (isCurrentBing) {
          const isStillInCollection = bingList.some((item) =>
            isSameBingWallpaper(item.url, currentUrl)
          );

          if (!isStillInCollection) {
            // 发现允许选择的 bing 图片集合当中没有这个图片了！
            // 核心要求：立刻获取更新的图片集合中的第一个，并且先下载到完整图片转 base 再让前端界面渲染显示避免出现正在加载的断层感觉
            const newFirstBing = bingList[0];
            console.log(
              "[Wallpaper] 当前 Bing 壁纸已不在允许集合中，后台开始下载新第 1 张壁纸转 Base64:",
              newFirstBing.title
            );

            try {
              // 纯后台异步下载完整图片转为 Base64，准备就绪后存入 IndexedDB
              const base64 = await fetchImageAsBase64(newFirstBing.url);
              const newRecord: StoredBingWallpaper = {
                id: "latest_bing",
                url: newFirstBing.url,
                base64,
                title: newFirstBing.title,
                copyright: newFirstBing.copyright,
                date: newFirstBing.date,
                timestamp: Date.now(),
              };
              await saveStoredBingWallpaper(newRecord);
              setCachedBingRecord(newRecord);

              // 完整图片已下载并转为 Base64，现在才更新选中的壁纸 URL，保证渲染时双图层无任何白屏或断层！
              setSettings((s) => ({
                ...s,
                selectedWallpaperUrl: newFirstBing.url,
                currentIndex: 0,
              }));
              console.log(
                "[Wallpaper] 最新第 1 张 Bing 壁纸已完整转 Base64，界面平滑更新渲染完成:",
                newFirstBing.title
              );
            } catch (err) {
              console.error("[Wallpaper] 后台下载新 Bing 壁纸转 Base64 失败:", err);
            }
          } else {
            // 当前壁纸仍在集合中，检查本地 IndexedDB 是否已有其 Base64
            const match = bingList.find((b) => isSameBingWallpaper(b.url, currentUrl));
            if (match) {
              const cached = await getStoredBingWallpaper();
              if (!cached || !isSameBingWallpaper(cached.url, currentUrl)) {
                try {
                  const b64 = await fetchImageAsBase64(match.url);
                  const rec: StoredBingWallpaper = {
                    id: "latest_bing",
                    url: match.url,
                    base64: b64,
                    title: match.title,
                    copyright: match.copyright,
                    date: match.date,
                    timestamp: Date.now(),
                  };
                  await saveStoredBingWallpaper(rec);
                  setCachedBingRecord(rec);
                } catch {
                  // ignore
                }
              }
            }
          }
        } else {
          // 当前非 Bing 壁纸，静默将最新第 1 张 Bing 壁纸转 Base64 缓存至 IndexedDB
          const firstBing = bingList[0];
          if (firstBing) {
            const cached = await getStoredBingWallpaper();
            if (!cached || !isSameBingWallpaper(cached.url, firstBing.url)) {
              try {
                const b64 = await fetchImageAsBase64(firstBing.url);
                const rec: StoredBingWallpaper = {
                  id: "latest_bing",
                  url: firstBing.url,
                  base64: b64,
                  title: firstBing.title,
                  copyright: firstBing.copyright,
                  date: firstBing.date,
                  timestamp: Date.now(),
                };
                await saveStoredBingWallpaper(rec);
                setCachedBingRecord(rec);
              } catch {
                // ignore
              }
            }
          }
        }
      }
    } catch {
      // 保持兜底列表
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 首屏立即拉取系统设置
  useEffect(() => {
    fetchSystemSettings();
  }, []);

  // 5. 核心要求：网页打开 10 秒之后，获取最新的 bing 图片列表并执行出圈检测与平滑更新
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWallpapersAndCheckRotation();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // 综合计算当前壁纸：优先允许使用本地快照/IndexedDB 缓存秒开直显
  const currentWallpaper = useMemo(() => {
    const isReady = isSettingsLoaded || !!cachedBingRecord;
    if (!isReady || wallpapers.length === 0) return null;

    let selectedItem: WallpaperItem | null = null;
    const targetUrl = settings.selectedWallpaperUrl;

    if (targetUrl) {
      selectedItem = wallpapers.find((w) => w.url === targetUrl) || {
        url: targetUrl,
        title: "系统背景壁纸",
        copyright: "System Wallpaper",
      };
    } else {
      const idx = Math.min(Math.max(0, settings.currentIndex), wallpapers.length - 1);
      selectedItem = wallpapers[idx] || wallpapers[0];
    }

    // 若当前为必应壁纸且本地 IndexedDB 存有 Base64，注入 base64 作为极速直显渲染源
    if (selectedItem && cachedBingRecord) {
      if (
        isSameBingWallpaper(selectedItem.url, cachedBingRecord.url) ||
        isBingWallpaper(selectedItem.url, selectedItem.copyright)
      ) {
        return {
          ...selectedItem,
          base64: cachedBingRecord.base64,
          title: selectedItem.title || cachedBingRecord.title || "今日必应壁纸",
          copyright: selectedItem.copyright || cachedBingRecord.copyright || "Microsoft Bing",
        };
      }
    }

    return selectedItem;
  }, [isSettingsLoaded, cachedBingRecord, wallpapers, settings.currentIndex, settings.selectedWallpaperUrl]);

  // 动态同步 html 与 body 类名，方便 CSS 为有壁纸状态做微调
  useEffect(() => {
    if (settings.enabled && currentWallpaper && (isSettingsLoaded || !!cachedBingRecord)) {
      document.documentElement.classList.add("has-wallpaper-active");
      document.body.classList.add("has-wallpaper-active");
    } else {
      document.documentElement.classList.remove("has-wallpaper-active");
      document.body.classList.remove("has-wallpaper-active");
    }
  }, [settings.enabled, currentWallpaper, isSettingsLoaded, cachedBingRecord]);

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
    const target = wallpapers[currentIndex];
    setSettings((prev) => ({
      ...prev,
      currentIndex,
      selectedWallpaperUrl: target?.url || prev.selectedWallpaperUrl,
    }));
    // 如果用户手动选中的是 Bing 壁纸，在后台下载 Base64 缓存至 IndexedDB
    if (target && isBingWallpaper(target.url, target.copyright)) {
      fetchImageAsBase64(target.url).then(async (b64) => {
        const rec: StoredBingWallpaper = {
          id: "latest_bing",
          url: target.url,
          base64: b64,
          title: target.title,
          copyright: target.copyright,
          date: target.date,
          timestamp: Date.now(),
        };
        await saveStoredBingWallpaper(rec);
        setCachedBingRecord(rec);
      }).catch(() => {});
    }
  };

  const nextWallpaper = () => {
    if (wallpapers.length === 0) return;
    setSettings((prev) => {
      const nextIdx = (prev.currentIndex + 1) % wallpapers.length;
      const target = wallpapers[nextIdx];
      if (target && isBingWallpaper(target.url, target.copyright)) {
        fetchImageAsBase64(target.url).then(async (b64) => {
          const rec: StoredBingWallpaper = {
            id: "latest_bing",
            url: target.url,
            base64: b64,
            title: target.title,
            copyright: target.copyright,
            date: target.date,
            timestamp: Date.now(),
          };
          await saveStoredBingWallpaper(rec);
          setCachedBingRecord(rec);
        }).catch(() => {});
      }
      return {
        ...prev,
        currentIndex: nextIdx,
        selectedWallpaperUrl: target?.url,
      };
    });
  };

  const prevWallpaper = () => {
    if (wallpapers.length === 0) return;
    setSettings((prev) => {
      const prevIdx = (prev.currentIndex - 1 + wallpapers.length) % wallpapers.length;
      const target = wallpapers[prevIdx];
      if (target && isBingWallpaper(target.url, target.copyright)) {
        fetchImageAsBase64(target.url).then(async (b64) => {
          const rec: StoredBingWallpaper = {
            id: "latest_bing",
            url: target.url,
            base64: b64,
            title: target.title,
            copyright: target.copyright,
            date: target.date,
            timestamp: Date.now(),
          };
          await saveStoredBingWallpaper(rec);
          setCachedBingRecord(rec);
        }).catch(() => {});
      }
      return {
        ...prev,
        currentIndex: prevIdx,
        selectedWallpaperUrl: target?.url,
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
        refresh: fetchWallpapersAndCheckRotation,
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
