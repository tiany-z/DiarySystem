/**
 * wallpaperStorage.ts
 * 基于 IndexedDB 本地底层数据库的 Bing 每日壁纸 Base64 缓存系统
 * - 使用浏览器的底层对象存储数据库 IndexedDB，突破 LocalStorage 的 5MB 配额限制
 * - 纯后台完整下载图片并转换为 Base64 DataURL，杜绝界面渲染时的网络断层感
 */

export interface StoredBingWallpaper {
  id: string; // 默认 "latest_bing"
  url: string; // 原始网络 URL
  base64: string; // 完整 Base64 DataURL (data:image/jpeg;base64,...)
  title?: string;
  copyright?: string;
  date?: string;
  timestamp: number; // 缓存时间戳
}

const DB_NAME = "diary_wallpaper_db";
const DB_VERSION = 1;
const STORE_NAME = "bing_wallpapers";
const RECORD_ID = "latest_bing";

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * 获取或初始化 IndexedDB 单例连接
 */
export function getWallpaperDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error("Failed to open IndexedDB"));
      };
    });
  }

  return dbPromise;
}

/**
 * 从 IndexedDB 读取上次缓存的 Bing 壁纸数据
 */
export async function getStoredBingWallpaper(): Promise<StoredBingWallpaper | null> {
  try {
    const db = await getWallpaperDB();
    return await new Promise<StoredBingWallpaper | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(RECORD_ID);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn("[WallpaperDB] Failed to read cached Bing wallpaper:", err);
    return null;
  }
}

/**
 * 将获取到的 Bing 壁纸 Base64 写入 IndexedDB
 */
export async function saveStoredBingWallpaper(data: Omit<StoredBingWallpaper, "id">): Promise<void> {
  try {
    const db = await getWallpaperDB();
    const record: StoredBingWallpaper = {
      ...data,
      id: RECORD_ID,
      timestamp: data.timestamp || Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[WallpaperDB] Failed to save Bing wallpaper to IndexedDB:", err);
  }
}

/**
 * 后台下载完整图片并转换为 Base64 DataURL
 * - 主通道：Fetch Blob + FileReader.readAsDataURL (Bing CDN 完美支持 CORS)
 * - 备用通道：Image + Canvas toDataURL
 */
export async function fetchImageAsBase64(url: string, timeoutMs: number = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. 主通道：Fetch API
    const response = await fetch(url, {
      mode: "cors",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    clearTimeout(timer);

    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string" && reader.result.startsWith("data:image")) {
            resolve(reader.result);
          } else {
            reject(new Error("FileReader did not produce a valid image DataURL"));
          }
        };
        reader.onerror = () => reject(reader.error || new Error("FileReader error"));
        reader.readAsDataURL(blob);
      });
    }
  } catch (fetchErr: any) {
    clearTimeout(timer);
    console.warn("[WallpaperStorage] Fetch blob failed, falling back to Canvas:", fetchErr?.message || fetchErr);
  }

  // 2. 备用通道：Image + Canvas
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const imgTimer = setTimeout(() => {
      img.src = "";
      reject(new Error(`Timeout loading image for Base64 conversion: ${url}`));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(imgTimer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to get 2D canvas context");
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        resolve(dataUrl);
      } catch (canvasErr) {
        reject(canvasErr);
      }
    };

    img.onerror = () => {
      clearTimeout(imgTimer);
      reject(new Error(`Image element failed to load: ${url}`));
    };

    img.src = url;
  });
}

/**
 * 提取 Bing 图片特征 ID，兼容不同分辨率或 URL 参数格式的比对
 * 例如：https://cn.bing.com/th?id=OHR.MountRainier_ZH-CN0123456789_1920x1080.jpg&rf=...
 * 提取到 "OHR.MountRainier_ZH-CN0123456789"
 */
export function extractBingImageIdentifier(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[?&]id=([^&]+)/i);
  if (match && match[1]) {
    // 移除扩展名和分辨率后缀 (例如 _1920x1080.jpg, _UHD.jpg, _720x1280.jpg 等以便跨分辨率比对)
    return match[1]
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/(_\d+x\d+|_uhd)$/i, "");
  }
  // 匹配 biturl 等无 id 参数的 Bing URL
  if (url.includes("bing.biturl.top")) {
    return "bing_biturl_daily";
  }
  return null;
}

/**
 * 判断指定 URL 或壁纸对象是否属于必应壁纸体系
 */
export function isBingWallpaper(url?: string | null, copyright?: string | null): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const lowerCp = (copyright || "").toLowerCase();
  return (
    lowerUrl.includes("bing.com") ||
    lowerUrl.includes("bing.biturl.top") ||
    lowerCp.includes("bing") ||
    lowerCp.includes("必应")
  );
}

/**
 * 比对两张壁纸是否为同一张必应壁纸
 */
export function isSameBingWallpaper(
  urlA?: string | null,
  urlB?: string | null
): boolean {
  if (!urlA || !urlB) return false;
  if (urlA === urlB) return true;

  const idA = extractBingImageIdentifier(urlA);
  const idB = extractBingImageIdentifier(urlB);
  if (idA && idB) {
    return idA === idB;
  }

  // 纯 URL 去除 hash 与查询参数比较 (仅适用于非 /th 等依赖 query 的固定静态资源)
  const cleanA = urlA.split("?")[0].split("#")[0];
  const cleanB = urlB.split("?")[0].split("#")[0];
  if (cleanA.includes("/th") || cleanB.includes("/th")) {
    return false;
  }
  return cleanA === cleanB && cleanA.length > 10;
}
