import { apiClient } from "./client";

export interface WallpaperItem {
  url: string;
  title: string;
  copyright: string;
  date?: string;
}

export interface WallpaperResponse {
  wallpapers: WallpaperItem[];
  cached: boolean;
  fallback?: boolean;
}

export const wallpaperApi = {
  getBingWallpapers: () => {
    return apiClient.post<WallpaperResponse>("/api/wallpaper/bing", {});
  },
};
