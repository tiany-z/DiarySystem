import { returnSuccess, StandardResult } from "#core";

interface BingWallpaperItem {
  url: string;
  title: string;
  copyright: string;
  date?: string;
}

let cachedWallpapers: BingWallpaperItem[] = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4小时内存缓存

const FALLBACK_WALLPAPERS: BingWallpaperItem[] = [
  {
    url: "https://bing.biturl.top/?resolution=1920&format=image&index=0",
    title: "今日必应灵感壁纸",
    copyright: "Microsoft Bing Daily Wallpaper",
  },
  {
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop",
    title: "雷尼尔雪山与静谧湖泊",
    copyright: "Mount Rainier National Park (© Unsplash Curated)",
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop",
    title: "晨曦染金的雪峰群山",
    copyright: "Alpine Sunrise Panorama (© Unsplash Curated)",
  },
  {
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop",
    title: "薄雾深林与晨光微曦",
    copyright: "Mystic Forest in Morning Mist (© Unsplash Curated)",
  },
];

export const api = {
  routePath: "/api/wallpaper/bing",
  authRequired: false,
  run: null as any,
  handler: async (_reqCtx: any, _ctx: any): Promise<StandardResult<any>> => {
    try {
      const now = Date.now();
      if (cachedWallpapers.length > 0 && now - lastFetchedAt < CACHE_TTL_MS) {
        return returnSuccess({
          wallpapers: cachedWallpapers,
          cached: true,
        });
      }

      // 尝试向微软 Bing 官方接口请求最新每日壁纸
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      try {
        const resp = await fetch("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN", {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
          },
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data: any = await resp.json();
          if (data && Array.isArray(data.images) && data.images.length > 0) {
            const fetchedList: BingWallpaperItem[] = data.images.map((img: any) => ({
              url: `https://cn.bing.com${img.url}`,
              title: img.title || "今日必应壁纸",
              copyright: img.copyright || "Microsoft Bing",
              date: img.startdate || "",
            }));

            cachedWallpapers = fetchedList;
            lastFetchedAt = now;

            return returnSuccess({
              wallpapers: cachedWallpapers,
              cached: false,
            });
          }
        }
      } catch {
        // 网络超时或受限时平滑降级
      }

      return returnSuccess({
        wallpapers: FALLBACK_WALLPAPERS,
        cached: true,
        fallback: true,
      });
    } catch {
      return returnSuccess({
        wallpapers: FALLBACK_WALLPAPERS,
        cached: true,
        fallback: true,
      });
    }
  },
};

export default api;
